-- Fix get_dma_coverage_density function to correctly join zip codes
DROP FUNCTION IF EXISTS get_dma_coverage_density();

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH dma_investors AS (
    SELECT DISTINCT
      zcr.dma,
      zcr.state,
      m.investor_id,
      m.market_type
    FROM zip_code_reference zcr
    JOIN markets m ON zcr.zip_code = ANY(m.zip_codes)
    WHERE zcr.dma IS NOT NULL AND zcr.dma != ''
  ),
  dma_zip_counts AS (
    SELECT
      zcr.dma,
      COUNT(DISTINCT zcr.zip_code) as zip_count
    FROM zip_code_reference zcr
    WHERE zcr.dma IS NOT NULL AND zcr.dma != ''
    GROUP BY zcr.dma
  )
  SELECT 
    di.dma,
    MAX(di.state) as state,
    COUNT(DISTINCT di.investor_id)::bigint as investor_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'primary' THEN di.investor_id END)::bigint as primary_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'secondary' THEN di.investor_id END)::bigint as secondary_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'direct_purchase' THEN di.investor_id END)::bigint as direct_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'full_coverage' THEN di.investor_id END)::bigint as full_coverage_count,
    COALESCE(dzc.zip_count, 0)::bigint as total_zip_codes,
    ARRAY_AGG(DISTINCT di.investor_id) as investor_ids
  FROM dma_investors di
  LEFT JOIN dma_zip_counts dzc ON dzc.dma = di.dma
  GROUP BY di.dma, dzc.zip_count
  ORDER BY investor_count DESC;
END;
$$;