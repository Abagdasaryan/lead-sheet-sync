-- Update profiles with correct rep_alias, first_name, and last_name for all users

-- Mike Suermann
UPDATE public.profiles 
SET rep_alias = 'ms', first_name = 'Mike', last_name = 'Suermann'
WHERE email = 'rebelsrogues@gmail.com';

-- Craig Rifkin
UPDATE public.profiles 
SET rep_alias = 'cr', first_name = 'Craig', last_name = 'Rifkin'
WHERE email = 'craigallprogg@gmail.com';

-- Jason Seller
UPDATE public.profiles 
SET rep_alias = 'js', first_name = 'Jason', last_name = 'Seller'
WHERE email = 'phillywindow@gmail.com';

-- Pete Letushko
UPDATE public.profiles 
SET rep_alias = 'pl', first_name = 'Pete', last_name = 'Letushko'
WHERE email = 'moderngutter12@gmail.com';

-- Artur Bagdasaryan (already has correct rep_alias)
UPDATE public.profiles 
SET first_name = 'Artur', last_name = 'Bagdasaryan'
WHERE email = 'abgutterinstall@gmail.com';

-- Bradley Cohen
UPDATE public.profiles 
SET rep_alias = 'bc', first_name = 'Bradley', last_name = 'Cohen'
WHERE email = 'cwr19560@gmail.com';

-- Erik Wurz
UPDATE public.profiles 
SET rep_alias = 'ew', first_name = 'Erik', last_name = 'Wurz'
WHERE email = 'wurzerik@yahoo.com';

-- Camille Link
UPDATE public.profiles 
SET rep_alias = 'cl', first_name = 'Camille', last_name = 'Link'
WHERE email = 'camilleplaceholder';

-- Tim Frawley
UPDATE public.profiles 
SET rep_alias = 'tf', first_name = 'Tim', last_name = 'Frawley'
WHERE email = 'timothyfrawley1@gmail.com';

-- Phil Brooks
UPDATE public.profiles 
SET rep_alias = 'pb', first_name = 'Phil', last_name = 'Brooks'
WHERE email = 'Philabrooks@yahoo.com';

-- Jason Weikel
UPDATE public.profiles 
SET rep_alias = 'jw', first_name = 'Jason', last_name = 'Weikel'
WHERE email = 'weikelplaceholder';

-- Kevin Vachon
UPDATE public.profiles 
SET rep_alias = 'kv', first_name = 'Kevin', last_name = 'Vachon'
WHERE email = 'vachonservices@aol.com';

-- Chris Yeago
UPDATE public.profiles 
SET rep_alias = 'cy', first_name = 'Chris', last_name = 'Yeago'
WHERE email = 'chrisyeago1@gmail.com';

-- Lonny Fleekop
UPDATE public.profiles 
SET rep_alias = 'lf', first_name = 'Lonny', last_name = 'Fleekop'
WHERE email = 'lfleekop@comcast.net';

-- Jack ODonell
UPDATE public.profiles 
SET rep_alias = 'jo', first_name = 'Jack', last_name = 'ODonell'
WHERE email = 'odonellplaceholder';

-- Arick Alston
UPDATE public.profiles 
SET rep_alias = 'aa', first_name = 'Arick', last_name = 'Alston'
WHERE email = 'alstonplaceholder';

-- Ted Walordy
UPDATE public.profiles 
SET rep_alias = 'tw', first_name = 'Ted', last_name = 'Walordy'
WHERE email = 'walordyplaceholder';

-- Art B (already has correct rep_alias)
UPDATE public.profiles 
SET first_name = 'Art', last_name = 'B'
WHERE email = 'artur@covenantcapital.co';