-- Fix infinite recursion in admin RLS policies by using has_role() function
-- Drop problematic policies that directly query user_roles

-- Drop investors admin policies
DROP POLICY IF EXISTS "Admins can view all investors" ON public.investors;
DROP POLICY IF EXISTS "Admins can insert all investors" ON public.investors;
DROP POLICY IF EXISTS "Admins can update all investors" ON public.investors;
DROP POLICY IF EXISTS "Admins can delete all investors" ON public.investors;

-- Drop markets admin policies
DROP POLICY IF EXISTS "Admins can view all markets" ON public.markets;
DROP POLICY IF EXISTS "Admins can insert all markets" ON public.markets;
DROP POLICY IF EXISTS "Admins can update all markets" ON public.markets;
DROP POLICY IF EXISTS "Admins can delete all markets" ON public.markets;

-- Drop buy_box admin policies
DROP POLICY IF EXISTS "Admins can view all buy_box" ON public.buy_box;
DROP POLICY IF EXISTS "Admins can insert all buy_box" ON public.buy_box;
DROP POLICY IF EXISTS "Admins can update all buy_box" ON public.buy_box;
DROP POLICY IF EXISTS "Admins can delete all buy_box" ON public.buy_box;

-- Drop investor_documents admin policies
DROP POLICY IF EXISTS "Admins can view all investor_documents" ON public.investor_documents;
DROP POLICY IF EXISTS "Admins can insert all investor_documents" ON public.investor_documents;
DROP POLICY IF EXISTS "Admins can update all investor_documents" ON public.investor_documents;
DROP POLICY IF EXISTS "Admins can delete all investor_documents" ON public.investor_documents;

-- Drop user_seed_status admin policies
DROP POLICY IF EXISTS "Admins can view all user_seed_status" ON public.user_seed_status;
DROP POLICY IF EXISTS "Admins can insert all user_seed_status" ON public.user_seed_status;
DROP POLICY IF EXISTS "Admins can update all user_seed_status" ON public.user_seed_status;
DROP POLICY IF EXISTS "Admins can delete all user_seed_status" ON public.user_seed_status;

-- Recreate all policies using has_role() function to prevent recursion

-- Investors policies
CREATE POLICY "Admins can view all investors"
  ON public.investors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all investors"
  ON public.investors FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all investors"
  ON public.investors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all investors"
  ON public.investors FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Markets policies
CREATE POLICY "Admins can view all markets"
  ON public.markets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all markets"
  ON public.markets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all markets"
  ON public.markets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all markets"
  ON public.markets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Buy Box policies
CREATE POLICY "Admins can view all buy_box"
  ON public.buy_box FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all buy_box"
  ON public.buy_box FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all buy_box"
  ON public.buy_box FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all buy_box"
  ON public.buy_box FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Investor Documents policies
CREATE POLICY "Admins can view all investor_documents"
  ON public.investor_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all investor_documents"
  ON public.investor_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all investor_documents"
  ON public.investor_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all investor_documents"
  ON public.investor_documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User Seed Status policies
CREATE POLICY "Admins can view all user_seed_status"
  ON public.user_seed_status FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all user_seed_status"
  ON public.user_seed_status FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all user_seed_status"
  ON public.user_seed_status FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all user_seed_status"
  ON public.user_seed_status FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));