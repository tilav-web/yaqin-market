import type { AuthRole } from "@/types/auth-role.type";
import type { User } from "@/interfaces/user.interface";

export type AuthSessionSource = "phone" | "telegram";

export interface SendOtpResponse {
  success: boolean;
  message?: string;
  otp_length?: 4 | 6;
  otp_preview?: string;
  delivery_channel?: "telegram" | "preview" | "sms";
}

export interface VerifyOtpResponse {
  success: boolean;
  access_token: string;
  user_id?: string | null;
}

export interface AuthMeResponse {
  id: string;
  phone: string;
  role: AuthRole;
  user?: User | null;
  createdAt: string;
  updatedAt: string;
}
