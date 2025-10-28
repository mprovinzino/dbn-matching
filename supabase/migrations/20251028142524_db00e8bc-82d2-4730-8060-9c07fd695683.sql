-- Create function to get state-level coverage from markets table
CREATE OR REPLACE FUNCTION public.get_state_level_coverage()
RETURNS TABLE (
  state text,
  investor_id uuid,
  investor_name text,
  market_type text,
  tier integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    UNNEST(m.states) as state,
    m.investor_id,
    i.company_name as investor_name,
    m.market_type::text,
    i.tier
  FROM markets m
  JOIN investors i ON i.id = m.investor_id
  WHERE 
    m.states IS NOT NULL 
    AND array_length(m.states, 1) > 0
  ORDER BY state, i.company_name;
END;
$$;