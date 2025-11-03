-- Add search_path protection to get_dma_coverage function
-- This prevents potential SQL injection via search_path manipulation
CREATE OR REPLACE FUNCTION public.get_dma_coverage(market_zip_codes text[])
RETURNS TABLE(dma text, zip_count bigint, sample_zips text[], state text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zcr.dma,
    COUNT(*)::bigint as zip_count,
    (ARRAY_AGG(zcr.zip_code ORDER BY zcr.zip_code))[1:5] as sample_zips,
    MAX(zcr.state) as state
  FROM zip_code_reference zcr
  WHERE zcr.zip_code = ANY(market_zip_codes)
    AND zcr.dma IS NOT NULL
  GROUP BY zcr.dma
  ORDER BY zip_count DESC;
END;
$$;