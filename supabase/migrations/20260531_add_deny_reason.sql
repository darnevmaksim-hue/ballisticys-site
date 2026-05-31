ALTER TABLE public.download_requests ADD COLUMN IF NOT EXISTS deny_reason text;
