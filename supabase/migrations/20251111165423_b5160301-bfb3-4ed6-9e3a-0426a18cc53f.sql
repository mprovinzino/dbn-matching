-- Grant full access to authenticated users for investor management

-- Investors table: Grant full access to authenticated users
CREATE POLICY "Authenticated users can view all investors"
ON public.investors
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert investors"
ON public.investors
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all investors"
ON public.investors
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all investors"
ON public.investors
FOR DELETE
TO authenticated
USING (true);

-- Buy Box table: Grant full access to authenticated users
CREATE POLICY "Authenticated users can view all buy_box"
ON public.buy_box
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert buy_box"
ON public.buy_box
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all buy_box"
ON public.buy_box
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all buy_box"
ON public.buy_box
FOR DELETE
TO authenticated
USING (true);

-- Markets table: Grant full access to authenticated users
CREATE POLICY "Authenticated users can view all markets"
ON public.markets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert markets"
ON public.markets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all markets"
ON public.markets
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete all markets"
ON public.markets
FOR DELETE
TO authenticated
USING (true);