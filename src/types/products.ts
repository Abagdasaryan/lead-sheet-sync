export interface Product {
  id: string;
  product2Id: string;
  name: string;
  unitPrice: number;
  pricebook2Id: string;
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
  date: string;
  clientName: string;
  appointmentName: string;
  status: string;
  totalAmount: string;
  lineItems?: JobLineItem[];
}