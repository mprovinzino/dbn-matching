-- One-time data repair: normalize states and zip_codes arrays in markets table
-- This fixes issues where states/zips are stored as single space-separated strings

-- Step 1: Normalize states arrays
UPDATE markets
SET states = (
  SELECT ARRAY(
    SELECT DISTINCT UPPER(TRIM(REGEXP_REPLACE(state_token, '[^A-Za-z]', '', 'g')))
    FROM UNNEST(
      CASE 
        WHEN array_length(states, 1) = 1 AND states[1] ~ '[ ,]' THEN
          -- Single string with spaces/commas - split it
          regexp_split_to_array(REGEXP_REPLACE(states[1], '[^A-Za-z, ]', '', 'g'), '[ ,]+')
        ELSE
          -- Already proper array or empty
          states
      END
    ) AS state_token
    WHERE LENGTH(TRIM(REGEXP_REPLACE(state_token, '[^A-Za-z]', '', 'g'))) = 2
  )
)
WHERE states IS NOT NULL 
  AND array_length(states, 1) > 0
  AND (
    -- Has space-separated string
    (array_length(states, 1) = 1 AND states[1] ~ '[ ,]')
    -- Or has elements with punctuation
    OR EXISTS (SELECT 1 FROM UNNEST(states) s WHERE s ~ '[^A-Z]')
  );

-- Step 2: Normalize zip_codes arrays
UPDATE markets
SET zip_codes = (
  SELECT ARRAY(
    SELECT DISTINCT zip_token
    FROM UNNEST(
      CASE 
        WHEN array_length(zip_codes, 1) = 1 AND zip_codes[1] ~ '[ ,]' THEN
          -- Single string with spaces/commas - split it
          regexp_split_to_array(REGEXP_REPLACE(zip_codes[1], '[^0-9, ]', '', 'g'), '[ ,]+')
        ELSE
          -- Already proper array or empty
          zip_codes
      END
    ) AS zip_token
    WHERE zip_token ~ '^\d{5}$'  -- Only keep valid 5-digit zips
  )
)
WHERE zip_codes IS NOT NULL 
  AND array_length(zip_codes, 1) > 0
  AND (
    -- Has space-separated string
    (array_length(zip_codes, 1) = 1 AND zip_codes[1] ~ '[ ,]')
    -- Or has non-digit characters
    OR EXISTS (SELECT 1 FROM UNNEST(zip_codes) z WHERE z ~ '[^0-9]')
  );

-- Step 3: Create trigger function to normalize arrays on insert/update
CREATE OR REPLACE FUNCTION normalize_market_arrays()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize states array
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

  -- Normalize zip_codes array
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
$$ LANGUAGE plpgsql;

-- Step 4: Attach trigger to markets table
DROP TRIGGER IF EXISTS normalize_markets_trigger ON markets;
CREATE TRIGGER normalize_markets_trigger
  BEFORE INSERT OR UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION normalize_market_arrays();

-- Verification queries (commented for reference)
-- Check Spark coverage after fix:
-- SELECT m.market_type, m.states, m.zip_codes 
-- FROM markets m 
-- JOIN investors i ON i.id = m.investor_id 
-- WHERE i.company_name ILIKE '%spark%' OR i.company_name ILIKE '%maximized%';

-- Check Miles coverage after fix:
-- SELECT m.market_type, m.states, m.zip_codes 
-- FROM markets m 
-- JOIN investors i ON i.id = m.investor_id 
-- WHERE i.company_name ILIKE '%miles%';