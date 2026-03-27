import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getAccessToken } from "@/api/api";

type BroadcastSocketPayload = {
  requestId: string;
  offerId?: string;
};

type UseBroadcastSocketOptions = {
  enabled?: boolean;
  role: "seller" | "customer";
  onRequestCreated?: (payload: BroadcastSocketPayload) => void;
  onRequestUpdated?: (payload: BroadcastSocketPayload) => void;
  onOfferUpdated?: (payload: BroadcastSocketPayload) => void;
};

function getSocketUrl() {
  const rawUrl =
    import.meta.env.VITE_API_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

  return String(rawUrl).replace(/\s+/g, "").replace(/\/$/, "");
}

export function useBroadcastSocket({
  enabled = true,
  role,
  onRequestCreated,
  onRequestUpdated,
  onOfferUpdated,
}: UseBroadcastSocketOptions) {
  const callbacksRef = useRef({
    onRequestCreated,
    onRequestUpdated,
    onOfferUpdated,
  });

  useEffect(() => {
    callbacksRef.current = {
      onRequestCreated,
      onRequestUpdated,
      onOfferUpdated,
    };
  }, [onOfferUpdated, onRequestCreated, onRequestUpdated]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const socket = io(`${getSocketUrl()}/broadcast`, {
      withCredentials: true,
      transports: ["websocket"],
    });

    const subscribeEvent = role === "seller" ? "seller:subscribe" : "customer:subscribe";

    socket.on("connect", () => {
      socket.emit(subscribeEvent, { token });
    });

    socket.on("broadcast:request_created", (payload: BroadcastSocketPayload) => {
      callbacksRef.current.onRequestCreated?.(payload);
    });

    socket.on("broadcast:request_updated", (payload: BroadcastSocketPayload) => {
      callbacksRef.current.onRequestUpdated?.(payload);
    });

    socket.on("broadcast:offer_updated", (payload: BroadcastSocketPayload) => {
      callbacksRef.current.onOfferUpdated?.(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, role]);
}
