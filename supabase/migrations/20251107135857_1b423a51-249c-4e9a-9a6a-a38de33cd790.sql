-- Patch get_dma_coverage_density to filter only active investors
DROP FUNCTION IF EXISTS public.get_dma_coverage_density();

CREATE OR REPLACE FUNCTION public.get_dma_coverage_density()
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
  WITH zip_based AS (
    SELECT DISTINCT
      zcr.dma AS dma_name,
      zcr.state AS state_code,
      m.investor_id,
      m.market_type
    FROM markets m
    JOIN investors i ON i.id = m.investor_id
    JOIN zip_code_reference zcr ON zcr.zip_code = ANY(m.zip_codes)
    WHERE zcr.dma IS NOT NULL 
      AND zcr.dma <> ''
      AND i.status = 'active'
  ),
  state_based AS (
    SELECT DISTINCT
      zcr.dma AS dma_name,
      zcr.state AS state_code,
      m.investor_id,
      m.market_type
    FROM markets m
    JOIN investors i ON i.id = m.investor_id
    JOIN zip_code_reference zcr ON zcr.state = ANY(m.states)
    WHERE zcr.dma IS NOT NULL 
      AND zcr.dma <> ''
      AND m.states IS NOT NULL 
      AND array_length(m.states, 1) > 0
      AND i.status = 'active'
  ),
  dma_investors AS (
    SELECT DISTINCT dma_name, state_code, investor_id, market_type
    FROM (
      SELECT * FROM zip_based
      UNION ALL
      SELECT * FROM state_based
    ) s
  ),
  dma_zip_counts AS (
    SELECT zcr.dma AS dma_name, COUNT(DISTINCT zcr.zip_code) AS zip_count
    FROM zip_code_reference zcr
    WHERE zcr.dma IS NOT NULL AND zcr.dma <> ''
    GROUP BY zcr.dma
  )
  SELECT 
    di.dma_name,
    MAX(di.state_code) AS state_code,
    COUNT(DISTINCT di.investor_id)::bigint AS investor_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'primary' THEN di.investor_id END)::bigint AS primary_count,
    0::bigint AS secondary_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'direct_purchase' THEN di.investor_id END)::bigint AS direct_count,
    COUNT(DISTINCT CASE WHEN di.market_type = 'full_coverage' THEN di.investor_id END)::bigint AS full_coverage_count,
    COALESCE(dzc.zip_count, 0)::bigint AS total_zip_codes,
    ARRAY_AGG(DISTINCT di.investor_id) AS investor_ids
  FROM dma_investors di
  LEFT JOIN dma_zip_counts dzc ON dzc.dma_name = di.dma_name
  GROUP BY di.dma_name, dzc.zip_count
  ORDER BY COUNT(DISTINCT di.investor_id) DESC;
END;
$$;