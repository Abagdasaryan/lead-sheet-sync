-- Update Mark Kalokitis's profile with correct information
UPDATE public.profiles 
SET 
  first_name = 'Mark',
  last_name = 'Kalokitis',
  full_name = 'Mark Kalokitis',
  rep_alias = 'mk'
WHERE user_id = '899c8240-8541-4556-ab5f-9c63e9b9d8b6'::uuid;