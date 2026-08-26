export type User = { user_id: string; name: string; email: string };
export type Room = { name: string; width: number; length: number; x?: number; y?: number; floor?: number };
export type Project = {
  project_id?: string;
  name: string;
  build_type: string;
  width: number;
  length: number;
  rooms: Room[];
  cep?: string;
};
export type Offer = {
  id: string;
  title: string;
  price: number | null;
  currency?: string;
  thumbnail?: string | null;
  url: string;
  store: string;
  freight?: number;
  freight_days?: number | null;
  type?: string;
  note?: string;
  estimated_price?: number | null;
  price_range?: string;
  real_price?: boolean;
};
export type CepData = {
  cep: string;
  city: string;
  uf: string;
  neighborhood: string;
  street: string;
  freight_base: number;
  freight_days: number;
};
export type CartItem = {
  offer_id: string;
  title: string;
  price: number;
  store: string;
  url: string;
  thumbnail: string;
  freight: number;
  quantity: number;
  purchased?: boolean;
  added_at?: string;
};
export type PriceAlert = {
  alert_id: string;
  query: string;
  target_price: number;
  created_at: string;
  active: boolean;
};
