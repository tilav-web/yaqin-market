import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function useSocket(
  role: 'customer' | 'seller' | 'courier',
  onEvent?: (event: string, data: any) => void,
) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${BASE_URL}/broadcast`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Subscribe based on role
      socket.emit(`${role}:subscribe`, { token: accessToken });
    });

    const events = [
      'order:status-changed',
      'order:new-direct',
      'broadcast:offer_updated',
      'broadcast:request_created',
      'broadcast:request_updated',
      'courier:location-changed',
    ];

    events.forEach((event) => {
      socket.on(event, (data: any) => {
        onEvent?.(event, data);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, role]);

  const subscribeToOrder = useCallback(
    (orderId: string) => {
      socketRef.current?.emit('order:subscribe', {
        token: accessToken,
        order_id: orderId,
      });
    },
    [accessToken],
  );

  const sendCourierLocation = useCallback(
    (orderId: string, lat: number, lng: number) => {
      socketRef.current?.emit('courier:update-location', {
        token: accessToken,
        order_id: orderId,
        lat,
        lng,
      });
    },
    [accessToken],
  );

  return { subscribeToOrder, sendCourierLocation };
}
