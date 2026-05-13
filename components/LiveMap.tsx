"use client";
import { useEffect, useRef } from "react";
import type { Map, Marker, Polyline } from "leaflet";
import type { TrackingSnapshot } from "@/lib/api";

// Status → Arabic label
const STATUS_LABEL: Record<string, string> = {
  pending:          "في الانتظار",
  confirmed:        "تم التأكيد",
  preparing:        "يُجهَّز طلبك",
  ready_for_pickup: "جاهز للاستلام",
  picked_up:        "تم الاستلام",
  on_the_way:       "في الطريق إليك",
  delivered:        "تم التوصيل 🎉",
  cancelled:        "ملغي",
};

const STATUS_COLOR: Record<string, string> = {
  pending:          "#8B5CF6",
  confirmed:        "#06B6D4",
  preparing:        "#F59E0B",
  ready_for_pickup: "#10B981",
  picked_up:        "#10B981",
  on_the_way:       "#6366F1",
  delivered:        "#22C55E",
  cancelled:        "#EF4444",
};

interface Props { data: TrackingSnapshot; }

export default function LiveMap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<{
    map: Map;
    driver: Marker;
    merchant: Marker;
    customer: Marker;
    line: Polyline;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || refs.current) return;

    // All leaflet APIs run client-side only (component is SSR-disabled via next/dynamic)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    // Fix icon paths for bundled environments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      center: [
        (data.merchant_lat + data.customer_lat) / 2,
        (data.merchant_lng + data.customer_lng) / 2,
      ],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark CartoDB tiles — free, no API key needed
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const icon = (emoji: string, size = 36) =>
      L.divIcon({
        html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,.7))">${emoji}</div>`,
        className: "",
        iconAnchor: [size / 2, size / 2],
      });

    const merchant = L.marker([data.merchant_lat, data.merchant_lng], { icon: icon("🏪") })
      .addTo(map)
      .bindPopup(`<b>${data.merchant_name}</b>`);

    const customer = L.marker([data.customer_lat, data.customer_lng], { icon: icon("📍", 32) })
      .addTo(map)
      .bindPopup("موقعك");

    const driver = L.marker([data.driver_lat, data.driver_lng], { icon: icon("🛵", 40) })
      .addTo(map);

    const line = L.polyline(
      [[data.merchant_lat, data.merchant_lng], [data.customer_lat, data.customer_lng]],
      { color: "#8B5CF6", weight: 2, dashArray: "6,8", opacity: 0.65 },
    ).addTo(map);

    // Fit all three points
    const bounds = L.latLngBounds([
      [data.merchant_lat, data.merchant_lng],
      [data.customer_lat, data.customer_lng],
      [data.driver_lat, data.driver_lng],
    ]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

    refs.current = { map, driver, merchant, customer, line };

    return () => {
      map.remove();
      refs.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update driver position on every data change
  useEffect(() => {
    if (!refs.current) return;
    refs.current.driver.setLatLng([data.driver_lat, data.driver_lng]);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    const bounds = L.latLngBounds([
      [data.merchant_lat, data.merchant_lng],
      [data.customer_lat, data.customer_lng],
      [data.driver_lat,   data.driver_lng],
    ]);
    refs.current.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
  }, [data.driver_lat, data.driver_lng, data.merchant_lat, data.merchant_lng, data.customer_lat, data.customer_lng]);

  const color = STATUS_COLOR[data.status] ?? "#8B5CF6";
  const label = STATUS_LABEL[data.status] ?? data.status;

  return (
    <div className="glass-card overflow-hidden">
      {/* Status banner */}
      <div className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: `1px solid ${color}33` }}>
        <div className="flex items-center gap-2">
          {data.status !== "delivered" && data.status !== "cancelled" && (
            <span className="text-xs text-vox-muted">{data.eta_minutes} دقيقة</span>
          )}
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        </div>
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
      </div>

      {/* Map container */}
      <div ref={containerRef} style={{ height: 220, width: "100%" }} />

      {/* Legend */}
      <div className="flex justify-center gap-5 px-4 py-2 text-[11px] text-vox-muted border-t"
           style={{ borderColor: "#1E1E2E" }}>
        <span>🏪 {data.merchant_name}</span>
        <span>🛵 السائق</span>
        <span>📍 أنت</span>
      </div>
    </div>
  );
}
