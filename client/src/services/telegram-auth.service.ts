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

function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
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

async function requestContactFromMiniApp() {
  const webApp = getTelegramWebApp();
  const requestContact = webApp?.requestContact;
  if (!webApp?.initData || !requestContact) {
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    let settled = false;

    const finalize = (result: boolean) => {
      if (settled) return;
      settled = true;
      webApp.offEvent?.("contactRequested", handleContactRequested);
      window.clearTimeout(timeoutId);
      resolve(result);
    };

    const handleContactRequested = (payload?: unknown) => {
      const status =
        typeof payload === "object" &&
        payload !== null &&
        "status" in payload &&
        typeof payload.status === "string"
          ? payload.status
          : null;

      if (status === "sent") {
        finalize(true);
        return;
      }

      if (status === "cancelled") {
        finalize(false);
      }
    };

    const timeoutId = window.setTimeout(() => finalize(false), 15000);

    webApp.onEvent?.("contactRequested", handleContactRequested);

    try {
      requestContact((shared) => finalize(Boolean(shared)));
    } catch {
      finalize(false);
    }
  });
}

async function waitForLinkedTelegramSession({
  attempts = 6,
  delayMs = 1500,
}: {
  attempts?: number;
  delayMs?: number;
} = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const session = await createTelegramSession();
    if (session?.linked && session.access_token) {
      return session;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  return null;
}

export const telegramAuthService = {
  getTelegramWebApp,
  getTelegramInitData,
  hasTelegramInitData,
  createTelegramSession,
  requestTelegramPhoneVerification,
  requestContactFromMiniApp,
  waitForLinkedTelegramSession,
};
