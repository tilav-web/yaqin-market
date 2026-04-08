import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronLeftIcon, MapIcon } from "lucide-react";
import { api } from "@/api/api";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap, LayerGroup } from "leaflet";

type NearbyStore = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  delivery_radius_km?: number;
};

const DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 };

export default function StoresMapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Try to get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Silently fall back to default center
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const center = userLocation ?? DEFAULT_CENTER;

  const { data: stores = [] } = useQuery({
    queryKey: ["stores", "nearby", center.lat, center.lng],
    queryFn: async () =>
      (
        await api.get<NearbyStore[]>("/stores/nearby", {
          params: { lat: center.lat, lng: center.lng, radius: 10 },
        })
      ).data,
    enabled: true,
  });

  // Initialize map
  useEffect(() => {
    let mounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (!mounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([center.lat, center.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);

      mapRef.current = map;
      layerRef.current = layerGroup;
    }

    initMap();

    return () => {
      mounted = false;
      layerRef.current?.clearLayers();
      mapRef.current?.remove();
      layerRef.current = null;
      mapRef.current = null;
    };
  }, [center.lat, center.lng]);

  // Sync markers
  useEffect(() => {
    let mounted = true;

    async function syncMarkers() {
      if (!mapRef.current || !layerRef.current) return;
      const L = await import("leaflet");
      if (!mounted || !layerRef.current) return;

      layerRef.current.clearLayers();

      // User location marker (blue)
      if (userLocation) {
        L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 10,
          color: "#1d4ed8",
          fillColor: "#3b82f6",
          fillOpacity: 0.9,
          weight: 3,
        })
          .bindPopup("<strong>Sizning joylashuvingiz</strong>")
          .addTo(layerRef.current);
      }

      // Store markers
      stores.forEach((store) => {
        // Delivery radius circle
        if (store.delivery_radius_km) {
          L.circle([store.lat, store.lng], {
            radius: store.delivery_radius_km * 1000,
            color: "#c2410c",
            fillColor: "#ff6b45",
            fillOpacity: 0.06,
            weight: 1.5,
          }).addTo(layerRef.current!);
        }

        // Store marker
        L.circleMarker([store.lat, store.lng], {
          radius: 8,
          color: "#c2410c",
          fillColor: "#ff6b45",
          fillOpacity: 0.92,
          weight: 2,
        })
          .bindPopup(
            `<div style="min-width:180px">` +
              `<strong>${store.name}</strong>` +
              (store.address
                ? `<div style="margin-top:6px;color:#64748b">${store.address}</div>`
                : "") +
              `</div>`,
          )
          .addTo(layerRef.current!);
      });
    }

    syncMarkers();

    return () => {
      mounted = false;
    };
  }, [stores, userLocation]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <section className="rounded-3xl border border-border bg-card/90 p-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]">
          <div className="flex items-center gap-3">
            <Link
              to="/mobile"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MapIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
                  Do'konlar xaritasi
                </p>
                <h1 className="text-lg font-semibold text-foreground">
                  Yaqin do'konlar
                </h1>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Map */}
      <div className="flex-1 px-4 pb-4">
        <div
          className={cn(
            "h-full overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)]",
          )}
        >
          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
