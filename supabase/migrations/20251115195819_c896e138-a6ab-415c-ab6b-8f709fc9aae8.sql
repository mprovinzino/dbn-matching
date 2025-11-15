-- Add HubSpot ID fields to investors table
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT,
ADD COLUMN IF NOT EXISTS hubspot_contact_id TEXT;

-- Create function to extract Company ID from URL using substring
CREATE OR REPLACE FUNCTION extract_hubspot_company_id(url TEXT) 
RETURNS TEXT AS $$
BEGIN
  IF url ~ '/record/0-2/(\d+)' THEN
    RETURN substring(url from '/record/0-2/(\d+)');
  ELSIF url ~ '/record/0-1/(\d+)' THEN
    RETURN substring(url from '/record/0-1/(\d+)');
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing Company IDs from URLs
UPDATE investors 
SET hubspot_company_id = extract_hubspot_company_id(hubspot_url)
WHERE hubspot_url IS NOT NULL AND hubspot_company_id IS NULL;

-- Create matching_queue table
CREATE TABLE matching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id TEXT NOT NULL UNIQUE,
  deal_name TEXT NOT NULL,
  autosourcer_id TEXT,
  
  -- Deal details
  address TEXT,
  city TEXT,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  property_type TEXT,
  condition TEXT,
  year_built INTEGER,
  ask_price NUMERIC,
  arv NUMERIC,
  
  -- Queue status
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to_matcher UUID,
  
  -- Matching metadata
  investors_requested INTEGER DEFAULT 3,
  investors_attached INTEGER DEFAULT 0,
  partial_match_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for matching_queue
CREATE INDEX idx_matching_queue_status ON matching_queue(status);
CREATE INDEX idx_matching_queue_deal_id ON matching_queue(deal_id);

-- Enable RLS on matching_queue
ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;

-- Policies for matching_queue
CREATE POLICY "Authenticated users can view queue"
  ON matching_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update queue"
  ON matching_queue FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert queue items"
  ON matching_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create lead_assignments table
CREATE TABLE lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  deal_id TEXT NOT NULL,
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Match quality (0-3: None, Secondary, Primary, Preferred)
  match_quality_score INTEGER NOT NULL CHECK (match_quality_score BETWEEN 0 AND 3),
  calculated_score INTEGER NOT NULL CHECK (calculated_score BETWEEN 0 AND 3),
  score_overridden BOOLEAN DEFAULT false,
  
  -- HubSpot tracking
  hubspot_company_id TEXT,
  hubspot_connection_id TEXT,
  attachment_status TEXT DEFAULT 'pending',
  
  -- Match reasoning
  match_reasons TEXT[],
  location_specificity TEXT,
  
  -- Audit trail
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attached_at TIMESTAMPTZ,
  
  UNIQUE(deal_id, investor_id)
);

-- Indexes for lead_assignments
CREATE INDEX idx_lead_assignments_deal_id ON lead_assignments(deal_id);
CREATE INDEX idx_lead_assignments_investor_id ON lead_assignments(investor_id);
CREATE INDEX idx_lead_assignments_status ON lead_assignments(attachment_status);

-- Enable RLS on lead_assignments
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for lead_assignments
CREATE POLICY "Authenticated users can view assignments"
  ON lead_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assignments"
  ON lead_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments"
  ON lead_assignments FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger for updating matching_queue timestamp
CREATE TRIGGER update_matching_queue_updated_at
BEFORE UPDATE ON matching_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();