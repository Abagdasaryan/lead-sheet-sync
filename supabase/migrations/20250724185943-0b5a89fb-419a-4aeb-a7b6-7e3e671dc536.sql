-- Update profiles for newly added users with correct rep_alias, first_name, and last_name

-- Lonny Fleekop
UPDATE public.profiles 
SET rep_alias = 'lf', first_name = 'Lonny', last_name = 'Fleekop'
WHERE email = 'lfleekop@comcast.net';

-- Chris Yeago  
UPDATE public.profiles 
SET rep_alias = 'cy', first_name = 'Chris', last_name = 'Yeago'
WHERE email = 'chrisyeago1@gmail.com';

-- Phil Brooks
UPDATE public.profiles 
SET rep_alias = 'pb', first_name = 'Phil', last_name = 'Brooks'  
WHERE email = 'philabrooks@yahoo.com';

-- Tim Frawley
UPDATE public.profiles 
SET rep_alias = 'tf', first_name = 'Tim', last_name = 'Frawley'
WHERE email = 'timothyfrawley1@gmail.com';

-- Erik Wurz
UPDATE public.profiles 
SET rep_alias = 'ew', first_name = 'Erik', last_name = 'Wurz'
WHERE email = 'wurzerik@yahoo.com';

-- Bradley Cohen  
UPDATE public.profiles 
SET rep_alias = 'bc', first_name = 'Bradley', last_name = 'Cohen'
WHERE email = 'cwr19560@gmail.com';

-- Pete Letushko
UPDATE public.profiles 
SET rep_alias = 'pl', first_name = 'Pete', last_name = 'Letushko'
WHERE email = 'moderngutter12@gmail.com';

-- Jason Seller
UPDATE public.profiles 
SET rep_alias = 'js', first_name = 'Jason', last_name = 'Seller'
WHERE email = 'phillywindow@gmail.com';