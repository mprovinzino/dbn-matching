-- Create investor_documents table to store Google Drive URLs
CREATE TABLE public.investor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('primary_zips', 'past_experience')),
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investor_documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents for their investors
CREATE POLICY "Users can view their investor documents"
  ON public.investor_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.investors
      WHERE investors.id = investor_documents.investor_id
      AND investors.user_id = auth.uid()
    )
  );

-- Users can insert documents for their investors
CREATE POLICY "Users can insert their investor documents"
  ON public.investor_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.investors
      WHERE investors.id = investor_documents.investor_id
      AND investors.user_id = auth.uid()
    )
  );

-- Users can update documents for their investors
CREATE POLICY "Users can update their investor documents"
  ON public.investor_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.investors
      WHERE investors.id = investor_documents.investor_id
      AND investors.user_id = auth.uid()
    )
  );

-- Users can delete documents for their investors
CREATE POLICY "Users can delete their investor documents"
  ON public.investor_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.investors
      WHERE investors.id = investor_documents.investor_id
      AND investors.user_id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_investor_documents_investor_id ON public.investor_documents(investor_id);
CREATE INDEX idx_investor_documents_document_type ON public.investor_documents(document_type);