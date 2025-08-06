-- Update James Duffy's profile with correct information
UPDATE profiles 
SET 
  first_name = 'James',
  last_name = 'Duffy',
  rep_alias = 'jd',
  full_name = 'James Duffy'
WHERE email = 'jsdlift@gmail.com';