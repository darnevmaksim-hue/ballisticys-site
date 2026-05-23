-- === БАЗА ДАННЫХ ДЛЯ BALLISTICYS SITE ===

-- Таблица профилей пользователей
create table public.profiles (
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

-- Политика: пользователи видят только свой профиль
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Политика: пользователи могут обновлять свой профиль
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Политика: админы видят всех
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Таблица VIP подписок
create table public.vip_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс для быстрого поиска активных подписок
create index idx_vip_subscriptions_active on public.vip_subscriptions(user_id, is_active) 
  where is_active = true;

-- Включить RLS
alter table public.vip_subscriptions enable row level security;

-- Политика: пользователи видят свою подписку
create policy "Users can view own subscription"
  on public.vip_subscriptions for select
  using (auth.uid() = user_id);

-- Политика: админы видят все подписки
create policy "Admins can view all subscriptions"
  on public.vip_subscriptions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Политика: только админы могут создавать/изменять подписки
create policy "Admins can create subscriptions"
  on public.vip_subscriptions for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update subscriptions"
  on public.vip_subscriptions for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete subscriptions"
  on public.vip_subscriptions for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Таблица промокодов
create table public.promo_codes (
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

-- Индекс для быстрого поиска
create index idx_promo_codes_code on public.promo_codes(code);
create index idx_promo_codes_used on public.promo_codes(is_used);

-- Включить RLS
alter table public.promo_codes enable row level security;

-- Политика: все видят неиспользованные промокоды (для проверки)
create policy "Anyone can view unused promo codes"
  on public.promo_codes for select
  using (is_used = false);

-- Политика: админы видят все промокоды
create policy "Admins can view all promo codes"
  on public.promo_codes for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Политика: только админы могут создавать промокоды
create policy "Admins can create promo codes"
  on public.promo_codes for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Политика: пользователи могут использовать промокоды
create policy "Users can use promo codes"
  on public.promo_codes for update
  using (is_used = false)
  with check (is_used = true);

-- Таблица активности пользователей (для админ панели)
create table public.user_activity (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс
create index idx_user_activity_user on public.user_activity(user_id);
create index idx_user_activity_created on public.user_activity(created_at);

-- Включить RLS
alter table public.user_activity enable row level security;

-- Политика: админы видят всю активность
create policy "Admins can view all activity"
  on public.user_activity for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Политика: пользователи видят свою активность
create policy "Users can view own activity"
  on public.user_activity for select
  using (auth.uid() = user_id);

-- Политика: админы могут записывать активность
create policy "Admins can insert activity"
  on public.user_activity for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'vip')
    )
  );

-- Функция для проверки VIP статуса
create or replace function public.check_vip_status(user_uuid uuid)
returns boolean as $$
declare
  is_vip boolean;
begin
  select exists (
    select 1 from public.vip_subscriptions
    where user_id = user_uuid
    and is_active = true
    and end_time > timezone('utc'::text, now())
  ) into is_vip;
  
  return is_vip;
end;
$$ language plpgsql security definer;

-- Функция для проверки админ статуса
create or replace function public.check_admin_status(user_uuid uuid)
returns boolean as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = user_uuid and role = 'admin'
  ) into is_admin;
  
  return is_admin;
end;
$$ language plpgsql security definer;

-- Вставить тестового админа (после создания первого пользователя)
-- Выполни это ПОСЛЕ регистрации первого пользователя:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'твоя_почта@example.com';
