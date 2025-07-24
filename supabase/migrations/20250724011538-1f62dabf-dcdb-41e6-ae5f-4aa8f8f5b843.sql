-- Fix security warnings by setting search_path for all functions

-- Update generate_full_name function
CREATE OR REPLACE FUNCTION public.generate_full_name()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Concatenate first_name and last_name with proper spacing
  NEW.full_name = TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
  
  -- Handle case where both names might be null/empty
  IF NEW.full_name = '' OR NEW.full_name IS NULL THEN
    NEW.full_name = COALESCE(NEW.first_name, NEW.last_name, '');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;