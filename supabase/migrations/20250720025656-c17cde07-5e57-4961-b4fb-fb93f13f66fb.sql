-- Add name columns to profiles table to store representative names
ALTER TABLE public.profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Update the handle_new_user function to include names from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, rep_email, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;