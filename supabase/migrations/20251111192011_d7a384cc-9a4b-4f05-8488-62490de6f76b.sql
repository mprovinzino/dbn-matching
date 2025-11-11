-- Create function to calculate coverage_type from markets data
CREATE OR REPLACE FUNCTION calculate_coverage_type(investor_uuid uuid)
RETURNS coverage_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  full_coverage_state_count integer;
  has_zip_codes boolean;
  calculated_type coverage_type;
BEGIN
  -- Count unique states across all full_coverage markets
  SELECT COUNT(DISTINCT state)
  INTO full_coverage_state_count
  FROM markets m, unnest(m.states) AS state
  WHERE m.investor_id = investor_uuid
    AND m.market_type = 'full_coverage'
    AND m.states IS NOT NULL
    AND array_length(m.states, 1) > 0;
  
  -- Check if investor has any zip codes
  SELECT EXISTS(
    SELECT 1 FROM markets
    WHERE investor_id = investor_uuid
      AND zip_codes IS NOT NULL
      AND array_length(zip_codes, 1) > 0
  ) INTO has_zip_codes;
  
  -- Determine coverage type (26+ states = 50%+ of 50 US states = national)
  IF full_coverage_state_count >= 26 THEN
    calculated_type := 'national';
  ELSIF full_coverage_state_count >= 5 THEN
    calculated_type := 'multi_state';
  ELSIF full_coverage_state_count >= 1 THEN
    calculated_type := 'state';
  ELSIF has_zip_codes THEN
    calculated_type := 'local';
  ELSE
    calculated_type := 'local';
  END IF;
  
  RETURN calculated_type;
END;
$$;

-- Create trigger function to auto-update coverage_type
CREATE OR REPLACE FUNCTION update_investor_coverage_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the investor's coverage_type based on their markets
  UPDATE investors
  SET coverage_type = calculate_coverage_type(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.investor_id
      ELSE NEW.investor_id
    END
  )
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.investor_id
    ELSE NEW.investor_id
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on markets table
DROP TRIGGER IF EXISTS trigger_update_coverage_type ON markets;
CREATE TRIGGER trigger_update_coverage_type
AFTER INSERT OR UPDATE OR DELETE ON markets
FOR EACH ROW
EXECUTE FUNCTION update_investor_coverage_type();

-- Backfill all existing investors with correct coverage_type
UPDATE investors
SET coverage_type = calculate_coverage_type(id);