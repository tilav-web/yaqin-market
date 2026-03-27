import type { StoreSummary } from "@/interfaces/market.interface";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  createdAt: string;
  updatedAt: string;
  auth_id?: string | null;
  stores?: StoreSummary[];
  auth?: {
    phone?: string | null;
  } | null;
}
