-- Add a placeholder product to make mobile dropdown selection easier
INSERT INTO public.products (id, product2_id, name, unit_price, pricebook2_id)
VALUES (
  'placeholder-select',
  'placeholder-select', 
  '-- Select a product --',
  0.00,
  'placeholder'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price;
  
-- Ensure the placeholder appears first in the dropdown
UPDATE public.products 
SET created_at = '2020-01-01 00:00:00+00'::timestamptz
WHERE id = 'placeholder-select';