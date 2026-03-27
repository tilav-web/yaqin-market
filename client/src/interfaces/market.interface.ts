export interface DeliverySettings {
  id?: string;
  min_order_amount: number;
  delivery_fee: number;
  preparation_time: number;
  free_delivery_radius: number;
  delivery_price_per_km: number;
  max_delivery_radius: number;
  is_delivery_enabled: boolean;
}

export interface WorkingHour {
  day_of_week: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  banner?: string | null;
  rating: number;
  is_prime: boolean;
  is_active: boolean;
  is_open?: boolean;
  phone?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  distance_meters?: number | null;
  service_radius_meters?: number | null;
  today_hours?: WorkingHour | null;
  deliverySettings?: DeliverySettings[];
  owner?: {
    id?: string;
    first_name?: string;
    last_name?: string;
  } | null;
}

export interface ProductImage {
  url: string;
  is_main: boolean;
}

export interface ProductCatalogItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  images: ProductImage[];
  attributes?: Record<string, unknown> | null;
  is_active: boolean;
  parent_id?: number | null;
  children?: ProductCatalogItem[];
  category?: {
    id: string;
    name: string;
  } | null;
  unit?: {
    id: number;
    name: string;
    short_name?: string | null;
  } | null;
}

export interface StoreProduct {
  id: string;
  store_id: string;
  product_id: number;
  price: number;
  stock: number;
  status: string;
  is_prime: boolean;
  distance_meters?: number;
  service_radius_meters?: number;
  product: ProductCatalogItem;
  store?: StoreSummary;
}

export interface OrderItemSummary {
  id?: string;
  product_id: number;
  product_name: string;
  product_image?: string | null;
  store_product_id?: string | null;
  quantity: number;
  price: number;
  total_price: number;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  order_type: string;
  status: string;
  total_price: number;
  items_price: number;
  delivery_price: number;
  payment_method: string;
  is_paid: boolean;
  delivery_address: string;
  delivery_details?: string | null;
  customer_note?: string | null;
  store_note?: string | null;
  createdAt: string;
  accepted_at?: string | null;
  ready_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  store?: StoreSummary | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    auth?: { phone?: string | null } | null;
  } | null;
  courier?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  items: OrderItemSummary[];
}

export interface BroadcastRequestItem {
  id: string;
  product_id: number;
  product_name: string;
  quantity: number;
}

export interface BroadcastOfferItem {
  id: string;
  request_item_id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  store_product_id?: string | null;
}

export interface BroadcastOffer {
  id: string;
  request_id: string;
  store_id: string;
  seller_id?: string | null;
  status: string;
  subtotal_price: number;
  delivery_price: number;
  total_price: number;
  estimated_minutes: number;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  store: StoreSummary;
  items: BroadcastOfferItem[];
}

export interface BroadcastRequest {
  id: string;
  customer_id: string;
  title: string;
  note?: string | null;
  status: string;
  radius_km: number;
  delivery_lat: number;
  delivery_lng: number;
  delivery_address: string;
  delivery_details?: string | null;
  selected_offer_id?: string | null;
  selected_at?: string | null;
  expires_at?: string | null;
  createdAt: string;
  updatedAt: string;
  items: BroadcastRequestItem[];
  offers: BroadcastOffer[];
  my_offer?: BroadcastOffer | null;
}
