CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('general','announcements')),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forum_posts_channel_created_idx ON public.forum_posts (channel, created_at DESC);

GRANT SELECT ON public.forum_posts TO anon;
GRANT SELECT, INSERT, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY forum_public_read ON public.forum_posts FOR SELECT USING (true);

CREATE POLICY forum_insert ON public.forum_posts FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (channel = 'general' OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY forum_delete ON public.forum_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;

CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS TABLE(total_users bigint, total_listings bigint, total_orders bigint, new_users_7d bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.listings),
    (SELECT count(*) FROM public.orders),
    (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days')
  WHERE public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;