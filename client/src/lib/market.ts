import axios from "axios";
import type { AuthRole } from "@/types/auth-role.type";

const moneyFormatter = new Intl.NumberFormat("uz-UZ");
const dateTimeFormatter = new Intl.DateTimeFormat("uz-UZ", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMoney(value: number | string | null | undefined) {
  return `${moneyFormatter.format(Number(value ?? 0))} so'm`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

export function getRoleHomePath(role?: AuthRole | null) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "SELLER":
      return "/seller";
    case "COURIER":
      return "/courier";
    default:
      return "/mobile";
  }
}

export function getRoleLabel(role?: AuthRole | null) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Admin";
    case "SELLER":
      return "Do'kon egasi";
    case "COURIER":
      return "Kuryer";
    default:
      return "Mijoz";
  }
}

export function getOrderStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Kutilmoqda";
    case "ACCEPTED":
      return "Qabul qilingan";
    case "READY":
      return "Tayyor";
    case "DELIVERING":
      return "Yo'lda";
    case "DELIVERED":
      return "Yetkazilgan";
    case "CANCELLED":
      return "Bekor qilingan";
    default:
      return status;
  }
}

export function getBroadcastStatusLabel(status: string) {
  switch (status) {
    case "OPEN":
      return "Takliflar kutilmoqda";
    case "SELECTED":
      return "Taklif tanlangan";
    case "EXPIRED":
      return "Muddati tugagan";
    case "CANCELLED":
      return "Bekor qilingan";
    default:
      return status;
  }
}

export function getStatusTone(status: string) {
  switch (status) {
    case "PENDING":
    case "OPEN":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "ACCEPTED":
    case "READY":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "DELIVERING":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "DELIVERED":
    case "SELECTED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "CANCELLED":
    case "EXPIRED":
    case "REJECTED":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function normalizePhone(value?: string | null) {
  if (!value) return "Telefon yo'q";
  return `+998 ${value}`;
}

export function extractErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; error_note?: string }
      | undefined;

    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (typeof data?.error_note === "string") {
      return data.error_note;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Noma'lum xatolik yuz berdi";
}
