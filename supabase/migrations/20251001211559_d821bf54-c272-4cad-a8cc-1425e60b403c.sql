-- Temporarily disable RLS on investor tables for data import
ALTER TABLE public.investors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_box DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets DISABLE ROW LEVEL SECURITY;