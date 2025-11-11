
-- Add unique constraint to prevent duplicate buy boxes per investor
ALTER TABLE buy_box ADD CONSTRAINT unique_investor_buybox UNIQUE (investor_id);
