-- Add full_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_name text;

-- Create function to generate full name from first and last name
CREATE OR REPLACE FUNCTION public.generate_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Concatenate first_name and last_name with proper spacing
  NEW.full_name = TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
  
  -- Handle case where both names might be null/empty
  IF NEW.full_name = '' OR NEW.full_name IS NULL THEN
    NEW.full_name = COALESCE(NEW.first_name, NEW.last_name, '');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update full_name on INSERT/UPDATE
CREATE TRIGGER update_profiles_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_full_name();

-- Update existing profiles to populate full_name field
UPDATE public.profiles 
SET full_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
WHERE full_name IS NULL;

-- Create index for better performance when matching with jobs_sold.rep
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);