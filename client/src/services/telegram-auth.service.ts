import axios from "axios";
import { api, setAccessToken } from "@/api/api";
import type { TelegramWebAppSessionResponse } from "@/interfaces/telegram-auth.interface";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  if (error instanceof Error) return error.message;
  return "Telegram bilan bog'lanishda xatolik yuz berdi";
}

function getTelegramInitData() {
  return (
    window.Telegram?.WebApp?.initData?.replace(/\s+/g, "").trim() ?? ""
  );
}

function hasTelegramInitData() {
  return Boolean(getTelegramInitData());
}

async function createTelegramSession() {
  const initData = getTelegramInitData();
  if (!initData) return null;

  try {
    const response = await api.post<TelegramWebAppSessionResponse>(
      "/bot/webapp/session",
      {},
      {
        headers: {
          "X-Telegram-Init-Data": initData,
        },
      },
    );

    if (response.data?.access_token) {
      setAccessToken(response.data.access_token);
    }

    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function requestTelegramPhoneVerification() {
  const initData = getTelegramInitData();
  if (!initData) {
    throw new Error("Telegram initData topilmadi");
  }

  try {
    const response = await api.post<{ success: boolean; message?: string }>(
      "/bot/webapp/request-phone",
      {},
      {
        headers: {
          "X-Telegram-Init-Data": initData,
        },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export const telegramAuthService = {
  getTelegramInitData,
  hasTelegramInitData,
  createTelegramSession,
  requestTelegramPhoneVerification,
};
