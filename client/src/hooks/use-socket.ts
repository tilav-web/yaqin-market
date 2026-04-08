import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/api/api";

function getSocketUrl() {
  const rawUrl =
    import.meta.env.VITE_API_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return String(rawUrl).replace(/\s+/g, "").replace(/\/$/, "");
}

type SocketRole = "customer" | "seller" | "courier";

/**
 * Universal socket hook — mobile dagi useSocket ning web versiyasi.
 *
 * Eventlar:
 * - order:status-changed   — buyurtma statusi o'zgardi
 * - order:new-direct       — yangi to'g'ridan buyurtma (seller)
 * - broadcast:offer_updated — broadcast taklifga javob
 * - broadcast:request_created — yangi broadcast so'rov
 * - broadcast:request_updated — broadcast holati o'zgardi
 * - courier:location-changed — kuryer joylashuvi yangilandi
 * - chat:new-message        — yangi chat xabar
 */
export function useSocket(
  role: SocketRole,
  onEvent?: (event: string, data: any) => void,
  options?: { enabled?: boolean },
) {
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  const enabled = options?.enabled ?? true;

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !enabled) return;

    const socket = io(`${getSocketUrl()}/broadcast`, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 20,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(`${role}:subscribe`, { token });
    });

    // Barcha eventlar
    const events = [
      "order:status-changed",
      "order:new-direct",
      "broadcast:offer_updated",
      "broadcast:request_created",
      "broadcast:request_updated",
      "courier:location-changed",
      "chat:new-message",
    ];

    for (const event of events) {
      socket.on(event, (data: any) => {
        callbackRef.current?.(event, data);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role, enabled]);

  const subscribeToOrder = useCallback(
    (orderId: string) => {
      const token = getAccessToken();
      socketRef.current?.emit("order:subscribe", {
        token,
        order_id: orderId,
      });
    },
    [],
  );

  const sendCourierLocation = useCallback(
    (orderId: string, lat: number, lng: number) => {
      const token = getAccessToken();
      socketRef.current?.emit("courier:update-location", {
        token,
        order_id: orderId,
        lat,
        lng,
      });
    },
    [],
  );

  return { subscribeToOrder, sendCourierLocation, socket: socketRef };
}
