-- Update Kevin Vachon's profile with correct information
UPDATE public.profiles 
SET 
  rep_alias = 'kv',
  first_name = 'Kevin',
  last_name = 'Vachon',
  full_name = 'Kevin Vachon'
WHERE user_id = '2e225b00-dad5-4f58-91cd-30d2b7c80a13'::uuid;