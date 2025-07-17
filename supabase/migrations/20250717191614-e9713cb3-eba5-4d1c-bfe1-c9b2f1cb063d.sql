-- Add rep_alias field to profiles table for sheet matching
ALTER TABLE public.profiles 
ADD COLUMN rep_alias TEXT;

-- Create index for better performance
CREATE INDEX idx_profiles_rep_alias ON public.profiles(rep_alias);