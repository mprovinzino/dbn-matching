-- Create function to get DMA coverage for an array of zip codes
CREATE OR REPLACE FUNCTION get_dma_coverage(market_zip_codes text[])
RETURNS TABLE (
  dma text,
  zip_count bigint,
  sample_zips text[],
  state text
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;