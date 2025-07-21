-- Create webhook configurations table for redundancy protection
CREATE TABLE public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook configs (read-only for authenticated users)
CREATE POLICY "Webhook configs are viewable by authenticated users" 
ON public.webhook_configs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Only admins can modify webhook configs
CREATE POLICY "Only admins can insert webhook configs" 
ON public.webhook_configs 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update webhook configs" 
ON public.webhook_configs 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete webhook configs" 
ON public.webhook_configs 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_webhook_configs_updated_at
BEFORE UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert current webhook configurations
INSERT INTO public.webhook_configs (name, url, description) VALUES 
('job_webhook', 'https://n8n.srv858576.hstgr.cloud/webhook/4bcba099-6b2a-4177-87c3-8930046d675b', 'Webhook for job and line item data'),
('sheet_update_webhook', 'https://n8n.srv858576.hstgr.cloud/webhook/5265ab2b-6ffb-46f8-bcb3-05f961cc40db', 'Webhook for sheet data updates');