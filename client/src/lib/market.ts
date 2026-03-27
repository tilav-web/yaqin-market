import axios from "axios";
import type { DeliverySettings } from "@/interfaces/market.interface";
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

export function formatDistanceMeasure(value: number | string | null | undefined) {
  const distance = Number(value ?? 0);

  if (!Number.isFinite(distance) || distance <= 0) {
    return "0 m";
  }

  if (distance >= 1000) {
    const kilometers = distance / 1000;
    return Number.isInteger(kilometers)
      ? `${kilometers} km`
      : `${kilometers.toFixed(1)} km`;
  }

  return `${Math.round(distance)} m`;
}

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusKm = 6371;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c * 1000;
}

export function calculateDeliveryQuote(
  settings: DeliverySettings | null | undefined,
  storeLocation: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number } | null,
) {
  if (!settings || !storeLocation || !destination) {
    return null;
  }

  const distanceMeters = calculateDistanceMeters(
    storeLocation.lat,
    storeLocation.lng,
    destination.lat,
    destination.lng,
  );
  const maxDeliveryRadius = Number(settings.max_delivery_radius ?? 0);

  if (maxDeliveryRadius > 0 && distanceMeters > maxDeliveryRadius) {
    return {
      distanceMeters,
      deliveryPrice: 0,
      isDeliverable: false,
    };
  }

  if (!settings.is_delivery_enabled) {
    return {
      distanceMeters,
      deliveryPrice: 0,
      isDeliverable: false,
    };
  }

  let deliveryPrice = 0;
  const freeRadius = Number(settings.free_delivery_radius ?? 0);
  const baseFee = Number(settings.delivery_fee ?? 0);

  if (distanceMeters > freeRadius) {
    const extraKm = Math.max(0, (distanceMeters - freeRadius) / 1000);
    deliveryPrice = Math.ceil(
      baseFee + Number(settings.delivery_price_per_km ?? 0) * extraKm,
    );
  }

  return {
    distanceMeters,
    deliveryPrice,
    isDeliverable: true,
  };
}

export function getDeliveryPolicySummary(settings: DeliverySettings | null | undefined) {
  if (!settings?.is_delivery_enabled) {
    return "Yetkazib berish o'chirilgan.";
  }

  if (settings.delivery_note?.trim()) {
    return settings.delivery_note.trim();
  }

  const freeRadius = Number(settings.free_delivery_radius ?? 0);
  const maxRadius = Number(settings.max_delivery_radius ?? 0);
  const baseFee = Number(settings.delivery_fee ?? 0);
  const pricePerKm = Number(settings.delivery_price_per_km ?? 0);
  const parts: string[] = [];

  if (freeRadius > 0) {
    parts.push(`${formatDistanceMeasure(freeRadius)} gacha tekin`);
  }

  if (pricePerKm > 0) {
    const pricingText =
      baseFee > 0
        ? `${formatMoney(baseFee)} bazaviy narx + har 1 km uchun ${formatMoney(pricePerKm)}`
        : `har 1 km uchun ${formatMoney(pricePerKm)}`;

    parts.push(freeRadius > 0 ? `undan keyin ${pricingText}` : pricingText);
  } else if (baseFee > 0) {
    parts.push(
      freeRadius > 0
        ? `undan keyin ${formatMoney(baseFee)}`
        : `${formatMoney(baseFee)} bazaviy narx`,
    );
  }

  if (maxRadius > 0) {
    parts.push(`maksimum ${formatDistanceMeasure(maxRadius)}`);
  }

  return parts.length ? parts.join(", ") : "Yetkazib berish narxi hali sozlanmagan.";
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
