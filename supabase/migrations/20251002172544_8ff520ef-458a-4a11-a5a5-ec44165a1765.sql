-- Add 'full_coverage' to the market_type enum
ALTER TYPE market_type ADD VALUE IF NOT EXISTS 'full_coverage';