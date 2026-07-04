export interface UserProfile {
  uid: string;
  email: string;
  company_name: string;
  company_address: string;
  company_logo_url: string; // can be base64 data URL for easy logo uploads
  created_at: any;
}

export interface PaymentMethod {
  id?: string;
  name: string;
  details: string;
  is_active: boolean;
  created_at: any;
  user_id: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  event_date?: string; // YYYY-MM-DD (optional)
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  company_name_snapshot: string;
  company_address_snapshot: string;
  company_logo_snapshot: string;
  grand_total: number;
  paid_dp: number;
  remaining: number;
  payment_method_id: string;
  payment_method_name?: string; // Cache for easy display
  payment_method_details?: string; // Cache for easy display
  status: 'lunas' | 'belum_lunas';
  created_at: any;
  updated_at: any;
  user_id: string;
  items?: InvoiceItem[]; // Embedded for faster display & PDF export
}
