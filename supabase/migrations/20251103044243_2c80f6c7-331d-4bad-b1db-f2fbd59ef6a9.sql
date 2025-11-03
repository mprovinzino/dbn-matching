-- Add freeze_reason column to investors table
-- This column was missing and causing import failures
ALTER TABLE public.investors
ADD COLUMN freeze_reason text;

-- Add comment for documentation
COMMENT ON COLUMN public.investors.freeze_reason IS 'Reason why investor is frozen/paused';