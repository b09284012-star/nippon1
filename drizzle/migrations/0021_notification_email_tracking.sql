ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS emailed_at timestamptz;
UPDATE public.notifications SET emailed_at = now() WHERE emailed_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_pending_email_idx ON public.notifications (created_at) WHERE emailed_at IS NULL;