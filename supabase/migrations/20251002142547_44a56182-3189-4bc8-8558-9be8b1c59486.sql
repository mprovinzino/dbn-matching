-- Create enum for investor status
CREATE TYPE public.investor_status AS ENUM ('active', 'paused', 'test', 'inactive');

-- Add new status fields to investors table
ALTER TABLE public.investors
ADD COLUMN status public.investor_status NOT NULL DEFAULT 'active',
ADD COLUMN status_reason TEXT,
ADD COLUMN status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN status_changed_by TEXT;

-- Migrate existing data: extract status from tags array
UPDATE public.investors
SET status = CASE
  WHEN 'PAUSED' = ANY(tags) THEN 'paused'::investor_status
  WHEN 'TEST' = ANY(tags) THEN 'test'::investor_status
  WHEN 'Active' = ANY(tags) THEN 'active'::investor_status
  ELSE 'active'::investor_status
END,
status_reason = freeze_reason,
status_changed_at = updated_at;

-- Remove status-related values from tags array
UPDATE public.investors
SET tags = array_remove(array_remove(array_remove(tags, 'PAUSED'), 'TEST'), 'Active');

-- Drop the old freeze_reason column
ALTER TABLE public.investors
DROP COLUMN freeze_reason;