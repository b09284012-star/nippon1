DROP POLICY IF EXISTS forum_public_read ON public.forum_posts;
CREATE POLICY forum_auth_read ON public.forum_posts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_auth_read ON public.reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_auth_read ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS listings_public_read ON public.listings;
CREATE POLICY listings_auth_read ON public.listings FOR SELECT TO authenticated USING (true);