-- Add Kevin Vachon profile
-- Note: Using a placeholder user_id that will be updated when the auth user is created
INSERT INTO public.profiles (
  id,
  user_id,
  email,
  rep_email,
  rep_alias,
  first_name,
  last_name,
  full_name
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid, -- Placeholder user_id
  'Vachonservices@aol.com',
  'Vachonservices@aol.com',
  'kv',
  'Kevin',
  'Vachon',
  'Kevin Vachon'
);