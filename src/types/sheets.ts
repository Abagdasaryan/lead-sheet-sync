export interface LeadRow {
  date: string;
  'CLIENT NAME': string;
  AppointmentName: string;
  Status: 'New' | 'In Progress' | 'Sold' | 'Lost' | string;
  'Lost Reason'?: string;
  'Last Price'?: string;
  GutterDowns_Footage?: string;
  Guard_Footage?: string;
  Par_Price?: string;
  [key: string]: string | undefined;
}

export interface JobSoldRow {
  Date: string;
  Customer: string;
  'Total Sale': string;
  'Payment Type': string;
  'Install Date': string;
  'Job Number': string;
  RepEmail: string;
  [key: string]: string | undefined;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  rep_email: string | null;
  rep_alias: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobData {
  id?: string;
  client: string;
  job_number: string;
  rep: string;
  price_sold: string;
  payment_type: string;
  install_date: string;
  sf_order_id: string;
  lineItemsCount?: number;
  lineItems?: Array<{
    product_name: string;
    quantity: number;
  }>;
  webhookSent?: boolean;
  webhookSentAt?: string;
}

export interface SheetDataResponse {
  rows: LeadRow[] | JobSoldRow[];
  error?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}