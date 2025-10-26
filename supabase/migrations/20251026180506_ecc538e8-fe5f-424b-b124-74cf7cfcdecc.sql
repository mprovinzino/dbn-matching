-- Create function to get DMA coverage density for map visualization
CREATE OR REPLACE FUNCTION get_dma_coverage_density()
RETURNS TABLE (
  dma text,
  state text,
  investor_count bigint,
  primary_count bigint,
  secondary_count bigint,
  direct_count bigint,
  full_coverage_count bigint,
  total_zip_codes bigint,
  investor_ids uuid[]
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH dma_markets AS (
    SELECT 
      zcr.dma,
      zcr.state,
      m.investor_id,
      m.market_type,
      COUNT(DISTINCT unnest(m.zip_codes)) as zip_count
    FROM zip_code_reference zcr
    INNER JOIN markets m ON zcr.zip_code = ANY(m.zip_codes)
    WHERE zcr.dma IS NOT NULL
    GROUP BY zcr.dma, zcr.state, m.investor_id, m.market_type
  )
  SELECT 
    dm.dma,
    MAX(dm.state) as state,
    COUNT(DISTINCT dm.investor_id)::bigint as investor_count,
    COUNT(DISTINCT CASE WHEN dm.market_type = 'primary' THEN dm.investor_id END)::bigint as primary_count,
    COUNT(DISTINCT CASE WHEN dm.market_type = 'secondary' THEN dm.investor_id END)::bigint as secondary_count,
    COUNT(DISTINCT CASE WHEN dm.market_type = 'direct_purchase' THEN dm.investor_id END)::bigint as direct_count,
    COUNT(DISTINCT CASE WHEN dm.market_type = 'full_coverage' THEN dm.investor_id END)::bigint as full_coverage_count,
    SUM(dm.zip_count)::bigint as total_zip_codes,
    ARRAY_AGG(DISTINCT dm.investor_id) as investor_ids
  FROM dma_markets dm
  GROUP BY dm.dma
  ORDER BY investor_count DESC;
END;
$$;

-- Create function to get investors covering a specific DMA
CREATE OR REPLACE FUNCTION get_investors_by_dma(dma_name text)
RETURNS TABLE (
  investor_id uuid,
  company_name text,
  main_poc text,
  market_type text,
  tier integer,
  coverage_type text,
  zip_count bigint,
  status text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as investor_id,
    i.company_name,
    i.main_poc,
    m.market_type::text,
    i.tier,
    i.coverage_type::text,
    COUNT(DISTINCT zcr.zip_code)::bigint as zip_count,
    i.status::text
  FROM investors i
  INNER JOIN markets m ON m.investor_id = i.id
  INNER JOIN zip_code_reference zcr ON zcr.zip_code = ANY(m.zip_codes)
  WHERE zcr.dma = dma_name
  GROUP BY i.id, i.company_name, i.main_poc, m.market_type, i.tier, i.coverage_type, i.status
  ORDER BY zip_count DESC;
END;
$$;