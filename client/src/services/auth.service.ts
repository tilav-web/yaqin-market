import axios from "axios";
import { api, clearTokens, setAccessToken } from "@/api/api";
import type {
  AuthMeResponse,
  SendOtpResponse,
  VerifyOtpResponse,
} from "@/interfaces/auth.interface";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
    if (error.response?.status === 0) return "Server bilan aloqa yo'q";
  }
  if (error instanceof Error) return error.message;
  return "Noma'lum xatolik yuz berdi";
}

async function sendOtp(phone: string) {
  try {
    const response = await api.post<SendOtpResponse>("/auth/send-otp", {
      phone,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function verifyOtp(phone: string, otp: string) {
  try {
    const response = await api.post<VerifyOtpResponse>("/auth/verify-otp", {
      phone,
      otp,
    });
    if (response.data?.access_token) {
      setAccessToken(response.data.access_token);
    }
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function findMe() {
  try {
    const response = await api.get<AuthMeResponse>("/auth");
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    throw new Error(getErrorMessage(error));
  } finally {
    clearTokens();
  }
}

export const authService = {
  sendOtp,
  verifyOtp,
  findMe,
  logout,
};
