
export interface Product {
  id: string;
  product2_id: string;
  name: string;
  unit_price: number;
  pricebook2_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Job {
  id: string;
  client: string;
  jobNumber: string;
  rep: string;
  leadSoldFor: number;
  paymentType: string;
  installDate: string;
  sfOrderId: string;
  lineItems?: JobLineItem[];
  lineItemsLocked?: boolean;
  webhookSent?: boolean;
}
