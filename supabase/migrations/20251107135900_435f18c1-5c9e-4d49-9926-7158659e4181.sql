-- Patch get_investors_by_dma to filter only active investors
DROP FUNCTION IF EXISTS public.get_investors_by_dma(text);

CREATE OR REPLACE FUNCTION public.get_investors_by_dma(dma_name text)
RETURNS TABLE(
  investor_id uuid,
  company_name text,
  main_poc text,
  market_type text,
  tier integer,
  coverage_type text,
  zip_count bigint,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    AND i.status = 'active'
  GROUP BY i.id, i.company_name, i.main_poc, m.market_type, i.tier, i.coverage_type, i.status
  ORDER BY zip_count DESC;
END;
$function$;