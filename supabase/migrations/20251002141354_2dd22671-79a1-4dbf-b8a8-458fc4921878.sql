-- Create user_seed_status table to track one-time imports
CREATE TABLE public.user_seed_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seeded BOOLEAN NOT NULL DEFAULT false,
  seeded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_seed_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own seed status
CREATE POLICY "Users can view their own seed status"
ON public.user_seed_status
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own seed status
CREATE POLICY "Users can insert their own seed status"
ON public.user_seed_status
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own seed status
CREATE POLICY "Users can update their own seed status"
ON public.user_seed_status
FOR UPDATE
USING (auth.uid() = user_id);