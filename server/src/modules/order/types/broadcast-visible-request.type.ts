import { BroadcastOffer } from '../entities/broadcast-offer.entity';
import { BroadcastRequestStatus } from '../entities/broadcast-request.entity';

export type BroadcastVisibleRequest = {
  id: string;
  customer_id: string;
  status: BroadcastRequestStatus | string;
  radius_km: number;
  delivery_lat: number;
  delivery_lng: number;
  prime_visible_at?: Date | string | null;
  regular_visible_at?: Date | string | null;
  offers?: BroadcastOffer[];
  createdAt?: Date;
};
