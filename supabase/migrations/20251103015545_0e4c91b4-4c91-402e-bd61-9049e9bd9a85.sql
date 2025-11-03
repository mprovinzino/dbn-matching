-- Enable Row Level Security on tables that have it disabled
-- This fixes the critical security vulnerability where RLS policies exist but RLS is not enabled

ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_box ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_seed_status ENABLE ROW LEVEL SECURITY;
