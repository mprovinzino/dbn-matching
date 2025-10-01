-- Create enum types
CREATE TYPE coverage_type AS ENUM ('local', 'multi_state', 'state', 'national');
CREATE TYPE market_type AS ENUM ('direct_purchase', 'primary', 'secondary');

-- Create investors table
CREATE TABLE public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  hubspot_url TEXT,
  offer_types TEXT[] DEFAULT '{}',
  coverage_type coverage_type NOT NULL,
  tags TEXT[] DEFAULT '{}',
  freeze_reason TEXT,
  tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 10),
  weekly_cap INTEGER NOT NULL DEFAULT 0,
  main_poc TEXT NOT NULL,
  cold_accepts BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create buy_box table
CREATE TABLE public.buy_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE NOT NULL,
  property_types TEXT[] DEFAULT '{}',
  on_market_status TEXT[] DEFAULT '{}',
  year_built_min INTEGER,
  year_built_max INTEGER,
  condition_types TEXT[] DEFAULT '{}',
  price_min DECIMAL(12,2),
  price_max DECIMAL(12,2),
  timeframe TEXT[] DEFAULT '{}',
  lead_types TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create markets table
CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE NOT NULL,
  market_type market_type NOT NULL,
  states TEXT[] DEFAULT '{}',
  zip_codes TEXT[] DEFAULT '{}',
  dmas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create zip_code_reference table
CREATE TABLE public.zip_code_reference (
  zip_code TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  dma TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_box ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zip_code_reference ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investors
CREATE POLICY "Users can view their own investors"
  ON public.investors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own investors"
  ON public.investors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investors"
  ON public.investors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investors"
  ON public.investors FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for buy_box
CREATE POLICY "Users can view buy_box for their investors"
  ON public.buy_box FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = buy_box.investor_id
    AND investors.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert buy_box for their investors"
  ON public.buy_box FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = buy_box.investor_id
    AND investors.user_id = auth.uid()
  ));

CREATE POLICY "Users can update buy_box for their investors"
  ON public.buy_box FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = buy_box.investor_id
    AND investors.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete buy_box for their investors"
  ON public.buy_box FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = buy_box.investor_id
    AND investors.user_id = auth.uid()
  ));

-- RLS Policies for markets
CREATE POLICY "Users can view markets for their investors"
  ON public.markets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = markets.investor_id
    AND investors.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert markets for their investors"
  ON public.markets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = markets.investor_id
    AND investors.user_id = auth.uid()
  ));

CREATE POLICY "Users can update markets for their investors"
  ON public.markets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = markets.investor_id
    AND investors.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete markets for their investors"
  ON public.markets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.investors
    WHERE investors.id = markets.investor_id
    AND investors.user_id = auth.uid()
  ));

-- RLS Policies for zip_code_reference (public read access)
CREATE POLICY "Anyone can view zip codes"
  ON public.zip_code_reference FOR SELECT
  USING (true);

-- Create update triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investors_updated_at
  BEFORE UPDATE ON public.investors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buy_box_updated_at
  BEFORE UPDATE ON public.buy_box
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_markets_updated_at
  BEFORE UPDATE ON public.markets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_investors_user_id ON public.investors(user_id);
CREATE INDEX idx_investors_tier ON public.investors(tier);
CREATE INDEX idx_investors_company_name ON public.investors(company_name);
CREATE INDEX idx_buy_box_investor_id ON public.buy_box(investor_id);
CREATE INDEX idx_markets_investor_id ON public.markets(investor_id);
CREATE INDEX idx_zip_code_state ON public.zip_code_reference(state);
CREATE INDEX idx_zip_code_city ON public.zip_code_reference(city);