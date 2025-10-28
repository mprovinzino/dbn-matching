-- 1) Restrict state-level coverage to full_coverage only
CREATE OR REPLACE FUNCTION public.get_state_level_coverage()
RETURNS TABLE(state text, investor_id uuid, investor_name text, market_type text, tier integer)
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
    AND m.market_type = 'full_coverage'
    AND i.status = 'active'
  ORDER BY state, i.company_name;
END;
$$;

-- 2) Strengthen normalization function to enforce semantics
CREATE OR REPLACE FUNCTION public.normalize_market_arrays()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Enforce semantics: only full_coverage can store states; non-full_coverage must not
  IF NEW.market_type <> 'full_coverage' THEN
    NEW.states := NULL;
  END IF;

  -- Conversely, full_coverage typically shouldn't carry zip_codes; clear if present to avoid confusion
  IF NEW.market_type = 'full_coverage' THEN
    NEW.zip_codes := NULL;
  END IF;

  -- Normalize states array (only applies if not NULL due to enforcement above)
  IF NEW.states IS NOT NULL AND array_length(NEW.states, 1) > 0 THEN
    NEW.states := (
      SELECT ARRAY(
        SELECT DISTINCT UPPER(TRIM(REGEXP_REPLACE(state_token, '[^A-Za-z]', '', 'g')))
        FROM UNNEST(
          CASE 
            WHEN array_length(NEW.states, 1) = 1 AND NEW.states[1] ~ '[ ,]' THEN
              regexp_split_to_array(REGEXP_REPLACE(NEW.states[1], '[^A-Za-z, ]', '', 'g'), '[ ,]+')
            ELSE
              NEW.states
          END
        ) AS state_token
        WHERE LENGTH(TRIM(REGEXP_REPLACE(state_token, '[^A-Za-z]', '', 'g'))) = 2
      )
    );
  END IF;

  -- Normalize zip_codes array (only applies if not NULL due to enforcement above)
  IF NEW.zip_codes IS NOT NULL AND array_length(NEW.zip_codes, 1) > 0 THEN
    NEW.zip_codes := (
      SELECT ARRAY(
        SELECT DISTINCT zip_token
        FROM UNNEST(
          CASE 
            WHEN array_length(NEW.zip_codes, 1) = 1 AND NEW.zip_codes[1] ~ '[ ,]' THEN
              regexp_split_to_array(REGEXP_REPLACE(NEW.zip_codes[1], '[^0-9, ]', '', 'g'), '[ ,]+')
            ELSE
              NEW.zip_codes
          END
        ) AS zip_token
        WHERE zip_token ~ '^\d{5}$'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Ensure trigger exists on markets
DROP TRIGGER IF EXISTS normalize_markets_trigger ON public.markets;
CREATE TRIGGER normalize_markets_trigger
BEFORE INSERT OR UPDATE ON public.markets
FOR EACH ROW
EXECUTE FUNCTION public.normalize_market_arrays();

-- 4) One-time data repair to enforce semantics on existing rows
UPDATE public.markets
SET states = NULL
WHERE market_type <> 'full_coverage' AND states IS NOT NULL AND array_length(states,1) > 0;

UPDATE public.markets
SET zip_codes = NULL
WHERE market_type = 'full_coverage' AND zip_codes IS NOT NULL AND array_length(zip_codes,1) > 0;

-- 5) Helper RPC to search investors by name without being blocked by RLS
CREATE OR REPLACE FUNCTION public.get_investor_ids_by_name(search_text text)
RETURNS TABLE(id uuid, company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.company_name
  FROM public.investors i
  WHERE i.company_name ILIKE '%' || COALESCE(search_text, '') || '%'
    AND i.status = 'active';
END;
$$;