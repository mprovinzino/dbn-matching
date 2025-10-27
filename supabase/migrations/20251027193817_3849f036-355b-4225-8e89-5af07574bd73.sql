-- Create function to get investors by state
CREATE OR REPLACE FUNCTION public.get_investors_by_state(state_code text)
RETURNS TABLE(
  investor_id uuid,
  company_name text,
  market_type text,
  coverage_type text,
  tier integer,
  dma text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- National coverage investors
  SELECT DISTINCT
    i.id as investor_id,
    i.company_name,
    m.market_type::text,
    i.coverage_type::text,
    i.tier,
    NULL::text as dma
  FROM investors i
  JOIN markets m ON m.investor_id = i.id
  WHERE m.market_type = 'full_coverage'
    AND i.status = 'active'
  
  UNION ALL
  
  -- State-specific investors with their DMAs
  SELECT DISTINCT
    i.id as investor_id,
    i.company_name,
    m.market_type::text,
    i.coverage_type::text,
    i.tier,
    zcr.dma
  FROM investors i
  JOIN markets m ON m.investor_id = i.id
  JOIN zip_code_reference zcr ON zcr.zip_code = ANY(m.zip_codes)
  WHERE zcr.state = state_code
    AND m.market_type != 'full_coverage'
    AND i.status = 'active'
    AND zcr.dma IS NOT NULL;
END;
$$;