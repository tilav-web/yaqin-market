import type { AuthRole } from "@/types/auth-role.type";
import type { StoreSummary } from "./market.interface";

export type RoleApplicationType = "SELLER" | "COURIER";
export type RoleApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SellerLegalType = "LEGAL_ENTITY" | "SOLE_PROPRIETOR" | "SELF_EMPLOYED";

export interface SellerLegal {
  id: string;
  type: SellerLegalType;
  official_name: string;
  tin?: string | null;
  reg_no?: string | null;
  reg_address?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  license_no?: string | null;
  license_until?: string | null;
  store_id?: string | null;
}

export interface RoleApplication {
  id: string;
  type: RoleApplicationType;
  status: RoleApplicationStatus;
  user_id: string;
  phone?: string | null;
  note?: string | null;
  store_name?: string | null;
  owner_name?: string | null;
  legal_name?: string | null;
  store_phone?: string | null;
  store_address?: string | null;
  store_lat?: number | string | null;
  store_lng?: number | string | null;
  transport_type?: string | null;
  vehicle_number?: string | null;
  requested_store_id?: string | null;
  approved_store_id?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  createdAt: string;
  updatedAt: string;
  sellerLegal?: SellerLegal | null;
  requestedStore?: StoreSummary | null;
  approvedStore?: StoreSummary | null;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    auth?: {
      phone?: string | null;
      role?: AuthRole;
    } | null;
  } | null;
}
