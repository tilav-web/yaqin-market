import { useEffect, useMemo, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  meta?: string;
  tone?: "accent" | "store" | "offer";
};

const DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 };

function getToneStyles(tone: MapPoint["tone"]) {
  switch (tone) {
    case "store":
      return {
        color: "#1d4ed8",
        fillColor: "#3b82f6",
      };
    case "offer":
      return {
        color: "#065f46",
        fillColor: "#10b981",
      };
    default:
      return {
        color: "#c2410c",
        fillColor: "#ff6b45",
      };
  }
}

export default function LocationPickerMap({
  className,
  center,
  markers = [],
  radiusKm,
  interactive = false,
  onLocationSelect,
}: {
  className?: string;
  center?: { lat: number; lng: number } | null;
  markers?: MapPoint[];
  radiusKm?: number;
  interactive?: boolean;
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  const activeCenter = useMemo(
    () => center ?? markers[0] ?? DEFAULT_CENTER,
    [center, markers],
  );

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (!mounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([activeCenter.lat, activeCenter.lng], center ? 13 : 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);

      if (interactive) {
        map.on("click", (event) => {
          onLocationSelect?.({
            lat: event.latlng.lat,
            lng: event.latlng.lng,
          });
        });
      }

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
  }, [activeCenter.lat, activeCenter.lng, center, interactive, onLocationSelect]);

  useEffect(() => {
    let mounted = true;

    async function syncMap() {
      if (!mapRef.current || !layerRef.current) return;
      const L = await import("leaflet");
      if (!mounted || !mapRef.current || !layerRef.current) return;

      layerRef.current.clearLayers();

      if (center) {
        mapRef.current.setView([center.lat, center.lng], Math.max(mapRef.current.getZoom(), 13));
      }

      if (center && radiusKm) {
        L.circle([center.lat, center.lng], {
          radius: radiusKm * 1000,
          color: "#ff6b45",
          fillColor: "#ff6b45",
          fillOpacity: 0.08,
          weight: 2,
        }).addTo(layerRef.current);
      }

      markers.forEach((marker) => {
        const tone = getToneStyles(marker.tone);
        const circle = L.circleMarker([marker.lat, marker.lng], {
          radius: marker.tone === "accent" ? 9 : 7,
          color: tone.color,
          fillColor: tone.fillColor,
          fillOpacity: 0.92,
          weight: 2,
        });

        circle.bindPopup(
          `<div style="min-width: 180px"><strong>${marker.label}</strong>${
            marker.meta ? `<div style="margin-top:6px;color:#64748b">${marker.meta}</div>` : ""
          }</div>`,
        );
        circle.addTo(layerRef.current!);
      });
    }

    syncMap();

    return () => {
      mounted = false;
    };
  }, [center, markers, radiusKm]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_-50px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div ref={containerRef} className="h-[360px] w-full" />
    </div>
  );
}
