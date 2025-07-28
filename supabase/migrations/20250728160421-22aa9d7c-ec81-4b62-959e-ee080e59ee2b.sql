-- Create webhook_configs table for managing webhook URLs
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage webhooks (can be customized later)
CREATE POLICY "Admins can manage webhook configs" 
ON public.webhook_configs 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_webhook_configs_updated_at
BEFORE UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some default webhook configurations
INSERT INTO public.webhook_configs (name, url, description, is_active) VALUES
('job_webhook', 'https://n8n.srv858576.hstgr.cloud/webhook/4bcba099-6b2a-4177-87c3-8930046d675b', 'Job submission webhook for n8n', false),
('sheet_update_webhook', 'https://n8n.srv858576.hstgr.cloud/webhook/5265ab2b-6ffb-46f8-bcb3-05f961cc40db', 'Sheet update webhook for n8n', false)
ON CONFLICT (name) DO NOTHING;