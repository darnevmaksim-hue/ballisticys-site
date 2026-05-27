-- === БАЗА ДАННЫХ ДЛЯ BALLISTICYS SITE ===
-- Исправленная версия: без infinite recursion в RLS

-- Helper функции (security definer = без RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_vip()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.vip_subscriptions
    where user_id = auth.uid()
    and is_active = true
    and end_time > timezone('utc'::text, now())
  ) or public.is_admin();
$$;

-- Таблица профилей пользователей
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'vip', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Триггер для авто-создания профиля при регистрации
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Включить Row Level Security
alter table public.profiles enable row level security;

-- Политики PROFILES
create policy "Users view own" on public.profiles for select
  using (auth.uid() = id);
create policy "Users insert own" on public.profiles for insert
  with check (auth.uid() = id);
create policy "Users update own" on public.profiles for update
  using (auth.uid() = id);
create policy "Admins view all" on public.profiles for select
  using (public.is_admin());
create policy "Admins update all" on public.profiles for update
  using (public.is_admin());

-- Таблица VIP подписок
create table if not exists public.vip_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_vip_subscriptions_active
  on public.vip_subscriptions(user_id, is_active) where is_active = true;

alter table public.vip_subscriptions enable row level security;

-- Политики VIP_SUBSCRIPTIONS
create policy "Users view own sub" on public.vip_subscriptions for select
  using (auth.uid() = user_id);
create policy "Users insert own sub" on public.vip_subscriptions for insert
  with check (auth.uid() = user_id);
create policy "Admins view all subs" on public.vip_subscriptions for select
  using (public.is_admin());
create policy "Admins insert subs" on public.vip_subscriptions for insert
  with check (public.is_admin());
create policy "Admins update subs" on public.vip_subscriptions for update
  using (public.is_admin());
create policy "Admins delete subs" on public.vip_subscriptions for delete
  using (public.is_admin());

-- Таблица промокодов
create table if not exists public.promo_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  duration_hours bigint not null,
  description text,
  is_used boolean default false not null,
  used_by uuid references public.profiles(id),
  used_at timestamp with time zone,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_promo_codes_code on public.promo_codes(code);
create index if not exists idx_promo_codes_used on public.promo_codes(is_used);

alter table public.promo_codes enable row level security;

-- Политики PROMO_CODES
create policy "Anyone view unused" on public.promo_codes for select
  using (is_used = false);
create policy "Admins view all promo" on public.promo_codes for select
  using (public.is_admin());
create policy "Admins create promo" on public.promo_codes for insert
  with check (public.is_admin());
create policy "VIPs create promo" on public.promo_codes for insert
  with check (public.is_vip());
create policy "Users use promo" on public.promo_codes for update
  using (is_used = false)
  with check (is_used = true);

-- Таблица активности пользователей
create table if not exists public.user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_activity_user on public.user_activity(user_id);
create index if not exists idx_user_activity_created on public.user_activity(created_at);

alter table public.user_activity enable row level security;

-- Политики USER_ACTIVITY
create policy "Admins view all activity" on public.user_activity for select
  using (public.is_admin());
create policy "Users view own activity" on public.user_activity for select
  using (auth.uid() = user_id);
create policy "Users insert activity" on public.user_activity for insert
  with check (auth.uid() = user_id or public.is_admin());

-- Таблица запросов на скачивание
create table if not exists public.download_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  mod_name text not null,
  mc_version text not null,
  status text default 'pending' not null check (status in ('pending', 'approved', 'denied')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  description text,
  approved_promo_code text,
  approved_promo_duration integer
);

create index if not exists idx_download_requests_user on public.download_requests(user_id);
create index if not exists idx_download_requests_status on public.download_requests(status);

alter table public.download_requests enable row level security;

-- Политики DOWNLOAD_REQUESTS
create policy "Users view own requests" on public.download_requests for select
  using (auth.uid() = user_id);
create policy "Users create requests" on public.download_requests for insert
  with check (auth.uid() = user_id);
create policy "Admins view all requests" on public.download_requests for select
  using (public.is_admin());
create policy "Admins update requests" on public.download_requests for update
  using (public.is_admin());

-- Функция проверки доступа к скачиванию
create or replace function public.can_download(mod_name text, mc_version text default 'any')
returns boolean
language sql
security definer
stable
as $$
  select
    public.is_admin()
    or public.is_vip()
    or exists (
      select 1 from public.download_requests
      where user_id = auth.uid()
      and status = 'approved'
      and mod_name = can_download.mod_name
      and (can_download.mc_version = 'any' or mc_version = can_download.mc_version)
    );
$$;
create policy "Admins update requests" on public.download_requests for update
  using (public.is_admin());
