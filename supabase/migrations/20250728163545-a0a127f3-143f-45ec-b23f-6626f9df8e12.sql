-- Create table for Google Sheets configuration
CREATE TABLE public.sheet_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  spreadsheet_id TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sheet_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for sheet configs (only authenticated users can manage)
CREATE POLICY "Sheet configs are viewable by authenticated users" 
ON public.sheet_configs 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Only admins can insert sheet configs" 
ON public.sheet_configs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Only admins can update sheet configs" 
ON public.sheet_configs 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Only admins can delete sheet configs" 
ON public.sheet_configs 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_sheet_configs_updated_at
BEFORE UPDATE ON public.sheet_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration for the leads sheet
INSERT INTO public.sheet_configs (name, spreadsheet_id, description, is_active)
VALUES (
  'leads_sheet',
  '1Rmw62vaMzwdRLGLafOpUVEhpdDsrFKd_tm-MWreU8lA',
  'Primary leads Google Sheet',
  true
);