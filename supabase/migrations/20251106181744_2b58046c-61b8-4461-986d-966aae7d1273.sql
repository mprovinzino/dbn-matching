-- Restrict investor editing to admins only
-- Drop regular user INSERT/UPDATE/DELETE policies on investors table
DROP POLICY IF EXISTS "Users can insert their own investors" ON public.investors;
DROP POLICY IF EXISTS "Users can update their own investors" ON public.investors;
DROP POLICY IF EXISTS "Users can delete their own investors" ON public.investors;

-- Drop regular user INSERT/UPDATE/DELETE policies on buy_box table
DROP POLICY IF EXISTS "Users can insert buy_box for their investors" ON public.buy_box;
DROP POLICY IF EXISTS "Users can update buy_box for their investors" ON public.buy_box;
DROP POLICY IF EXISTS "Users can delete buy_box for their investors" ON public.buy_box;

-- Drop regular user INSERT/UPDATE/DELETE policies on markets table
DROP POLICY IF EXISTS "Users can insert markets for their investors" ON public.markets;
DROP POLICY IF EXISTS "Users can update markets for their investors" ON public.markets;
DROP POLICY IF EXISTS "Users can delete markets for their investors" ON public.markets;

-- Regular users can still VIEW their data, but only admins can modify it