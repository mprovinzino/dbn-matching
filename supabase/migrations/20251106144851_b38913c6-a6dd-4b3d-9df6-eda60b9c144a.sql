-- Step 1: Merge secondary markets into primary markets
-- For investors with both primary and secondary markets
WITH secondary_markets AS (
  SELECT investor_id, zip_codes, id
  FROM markets
  WHERE market_type = 'secondary'
),
primary_markets AS (
  SELECT investor_id, zip_codes, id
  FROM markets
  WHERE market_type = 'primary'
)
UPDATE markets m
SET zip_codes = ARRAY(
  SELECT DISTINCT unnest(m.zip_codes || COALESCE(sm.zip_codes, ARRAY[]::text[]))
)
FROM secondary_markets sm
WHERE m.investor_id = sm.investor_id
  AND m.market_type = 'primary';

-- Step 2: Convert secondary-only markets to primary
UPDATE markets
SET market_type = 'primary'
WHERE market_type = 'secondary'
  AND investor_id NOT IN (
    SELECT investor_id FROM markets WHERE market_type = 'primary'
  );

-- Step 3: Delete any remaining secondary markets (already merged)
DELETE FROM markets WHERE market_type = 'secondary';

-- Step 4: Update market_type enum to remove 'secondary'
ALTER TYPE market_type RENAME TO market_type_old;
CREATE TYPE market_type AS ENUM ('primary', 'direct_purchase', 'full_coverage');
ALTER TABLE markets ALTER COLUMN market_type TYPE market_type USING market_type::text::market_type;
DROP TYPE market_type_old;