
-- Insert new users into the profiles table with their rep_alias values
-- Note: These users will need to be created in the auth system separately, 
-- but we can prepare their profile entries here

-- First, let's insert the representatives that aren't already in the system
-- (excluding abgutterinstall@gmail.com and artur@covenantcapital.co as they already exist)

-- We'll use a temporary approach where we create profile entries that will be linked
-- when the users actually sign up. The handle_new_user() trigger will update these.

-- Insert Mike Suermann
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'rebelsrogues@gmail.com', 'rebelsrogues@gmail.com', 'ms')
ON CONFLICT (email) DO NOTHING;

-- Insert Craig Rifkin  
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'craigallprogg@gmail.com', 'craigallprogg@gmail.com', 'cr')
ON CONFLICT (email) DO NOTHING;

-- Insert Jason Seller
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'phillywindow@gmail.com', 'phillywindow@gmail.com', 'js')
ON CONFLICT (email) DO NOTHING;

-- Insert Pete Letushko
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'moderngutter12@gmail.com', 'moderngutter12@gmail.com', 'pl')
ON CONFLICT (email) DO NOTHING;

-- Insert Bradley Cohen
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'cwr19560@gmail.com', 'cwr19560@gmail.com', 'bc')
ON CONFLICT (email) DO NOTHING;

-- Insert Erik Wurz
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'wurzerik@yahoo.com', 'wurzerik@yahoo.com', 'ew')
ON CONFLICT (email) DO NOTHING;

-- Insert Camille Link (placeholder email)
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'camilleplaceholder@example.com', 'camilleplaceholder', 'cl')
ON CONFLICT (email) DO NOTHING;

-- Insert Tim Frawley
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'timothyfrawley1@gmail.com', 'timothyfrawley1@gmail.com', 'tf')
ON CONFLICT (email) DO NOTHING;

-- Insert Phil Brooks
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'Philabrooks@yahoo.com', 'Philabrooks@yahoo.com', 'pb')
ON CONFLICT (email) DO NOTHING;

-- Insert Jason Weikel (placeholder email)
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'weikelplaceholder@example.com', 'weikelplaceholder', 'jw')
ON CONFLICT (email) DO NOTHING;

-- Insert Kevin Vachon
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'vachonservices@aol.com', 'vachonservices@aol.com', 'kv')
ON CONFLICT (email) DO NOTHING;

-- Insert Chris Yeago
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'chrisyeago1@gmail.com', 'chrisyeago1@gmail.com', 'cy')
ON CONFLICT (email) DO NOTHING;

-- Insert Lonny Fleekop
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'lfleekop@comcast.net', 'lfleekop@comcast.net', 'lf')
ON CONFLICT (email) DO NOTHING;

-- Insert Jack ODonell (placeholder email)
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'odonellplaceholder@example.com', 'odonellplaceholder', 'jo')
ON CONFLICT (email) DO NOTHING;

-- Insert Arick Alston (placeholder email)
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'alstonplaceholder@example.com', 'alstonplaceholder', 'aa')
ON CONFLICT (email) DO NOTHING;

-- Insert Ted Walordy (placeholder email)
INSERT INTO public.profiles (user_id, email, rep_email, rep_alias)
VALUES (gen_random_uuid(), 'walordyplaceholder@example.com', 'walordyplaceholder', 'tw')
ON CONFLICT (email) DO NOTHING;

-- Update existing Artur B entry to ensure it has the correct rep_alias
UPDATE public.profiles 
SET rep_alias = 'acc' 
WHERE email = 'artur@covenantcapital.co';

-- Update existing abgutterinstall entry to ensure it has the correct rep_alias  
UPDATE public.profiles 
SET rep_alias = 'ab'
WHERE email = 'abgutterinstall@gmail.com';
