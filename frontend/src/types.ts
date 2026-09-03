export type User = { user_id: string; name: string; email: string };
// A wall is now an addressable object, not just an implied edge of the rectangle.
// "n" = top edge (-y), "s" = bottom (+y), "w" = left (-x), "e" = right (+x).
// A side missing from `walls` means the person deleted that wall to open the space up.
export type WallSide = "n" | "s" | "w" | "e";
export type OpeningKind = "porta" | "janela";
// `pos` is 0..1 along the wall (0.5 = centered); `width` is in metres.
export type Opening = { id: string; side: WallSide; kind: OpeningKind; pos: number; width: number };
export type Room = {
  name: string;
  width: number;
  length: number;
  x?: number;
  y?: number;
  floor?: number;
  walls?: WallSide[];
  openings?: Opening[];
};
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
