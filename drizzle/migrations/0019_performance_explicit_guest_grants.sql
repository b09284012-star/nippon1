REVOKE ALL ON public.performance_samples FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.performance_samples FROM authenticated;
GRANT SELECT ON public.performance_samples TO authenticated;