-- Create products table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  product2_id TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  pricebook2_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies - products should be readable by all authenticated users
CREATE POLICY "Products are viewable by authenticated users" 
ON public.products 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Only admins can modify products (you can adjust this later)
CREATE POLICY "Only admins can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update products" 
ON public.products 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can delete products" 
ON public.products 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Insert all the product data
INSERT INTO public.products (id, product2_id, name, unit_price, pricebook2_id) VALUES
('01uHn00000eOXm5IAG', '01tHn00000V2vg7IAB', '5" Gutter', 11.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmQIAW', '01tHn00000V2vgNIAR', '5" Gutter Guard', 14.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmFIAW', '01tHn00000V2vg8IAB', '6" Gutter', 12.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmKIAW', '01tHn00000V2vgMIAR', '6" Gutter Corner', 12.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmHIAW', '01tHn00000V2vgOIAR', '6" Gutter Guard', 15.00, '01sHn000002YTojIAG'),
('01uHn00000eOXm6IAG', '01tHn00000V2vgGIAR', 'CSR', 6.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmUIAW', '01tHn00000V2vgSIAR', 'Downspouts 2x3', 11.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmZIAW', '01tHn00000V2vgXIAR', 'Downspouts 3x4', 12.00, '01sHn000002YTojIAG'),
('01uHn00000eOXm7IAG', '01tHn00000V2vgJIAR', 'Drip Edge', 5.00, '01sHn000002YTojIAG'),
('01uHn00000eOXm8IAG', '01tHn00000V2vgIIAR', 'Existing Protection Removal', 3.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmBIAW', '01tHn00000V2vgCIAR', 'Fascia Wood', 12.00, '01sHn000002YTojIAG'),
('01uHn00000eOXm9IAG', '01tHn00000V2vg9IAB', 'Fascia Wrap', 12.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmPIAW', '01tHn00000V2vgKIAR', 'Labor', 60.00, '01sHn000002YTojIAG'),
('01uRP000001sEv3YAE', '01tRP000006pxfKYAQ', 'MISC', 2.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmGIAW', '01tHn00000V2vgHIAR', 'R&R', 3.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmCIAW', '01tHn00000V2vgAIAR', 'Soffit', 12.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmLIAW', '01tHn00000V2vgBIAR', 'Straps', 3.00, '01sHn000002YTojIAG'),
('01uHn00000eOXmDIAW', '01tHn00000V2vgDIAR', 'Wedge', 3.00, '01sHn000002YTojIAG');

-- Create trigger for updating updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();