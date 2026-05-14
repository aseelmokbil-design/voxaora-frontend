"use client";
import { useEffect, useRef } from "react";
import type { Map, Marker, Polyline } from "leaflet";
import type { TrackingSnapshot } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  pending:          "في الانتظار",
  confirmed:        "تم التأكيد",
  preparing:        "يُجهَّز طلبك",
  ready_for_pickup: "جاهز للاستلام",
  picked_up:        "تم الاستلام",
  on_the_way:       "السائق في الطريق إليك",
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
  const mapRef = useRef<Map | null>(null);
  const driverRef   = useRef<Marker | null>(null);
  const routeRef    = useRef<Polyline | null>(null);
  const initialised = useRef(false);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initialised.current) return;
    initialised.current = true;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    // Fix default icon paths
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      center: [data.merchant_lat, data.merchant_lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // OpenStreetMap dark tiles — free, no API key
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const icon = (emoji: string, size = 36) =>
      L.divIcon({
        html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,.7))">${emoji}</div>`,
        className: "",
        iconAnchor: [size / 2, size / 2],
      });

    // Merchant marker
    L.marker([data.merchant_lat, data.merchant_lng], { icon: icon("🏪") })
      .addTo(map)
      .bindPopup(`<b>${data.merchant_name}</b>${data.merchant_address ? `<br/>${data.merchant_address}` : ""}`);

    // Customer marker
    L.marker([data.customer_lat, data.customer_lng], { icon: icon("📍", 32) })
      .addTo(map)
      .bindPopup(data.customer_address || "موقعك");

    // Driver marker — only show if assigned
    if (data.has_driver) {
      const m = L.marker([data.driver_lat, data.driver_lng], { icon: icon("🛵", 40) }).addTo(map);
      driverRef.current = m;
    }

    // Route polyline — from OSRM real geometry if available, else straight dashed line
    if (data.route_coords && data.route_coords.length > 1) {
      // OSRM returns [lng, lat] pairs — Leaflet expects [lat, lng]
      const latLngs = data.route_coords.map(([lng, lat]) => [lat, lng] as [number, number]);
      const poly = L.polyline(latLngs, { color: "#8B5CF6", weight: 3, opacity: 0.8 }).addTo(map);
      routeRef.current = poly;
    } else {
      // Fallback straight line
      const poly = L.polyline(
        [[data.merchant_lat, data.merchant_lng], [data.customer_lat, data.customer_lng]],
        { color: "#8B5CF6", weight: 2, dashArray: "6,8", opacity: 0.5 },
      ).addTo(map);
      routeRef.current = poly;
    }

    // Fit bounds to all visible markers
    const points: [number, number][] = [
      [data.merchant_lat, data.merchant_lng],
      [data.customer_lat, data.customer_lng],
    ];
    if (data.has_driver) points.push([data.driver_lat, data.driver_lng]);
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });

    return () => {
      map.remove();
      mapRef.current = null;
      driverRef.current = null;
      routeRef.current = null;
      initialised.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update driver position on every real GPS push ─────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    if (data.has_driver) {
      if (driverRef.current) {
        driverRef.current.setLatLng([data.driver_lat, data.driver_lng]);
      } else {
        // Driver was just assigned — add marker
        const icon = (emoji: string, size = 36) =>
          L.divIcon({
            html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 8px rgba(0,0,0,.7))">${emoji}</div>`,
            className: "",
            iconAnchor: [size / 2, size / 2],
          });
        driverRef.current = L.marker([data.driver_lat, data.driver_lng], { icon: icon("🛵", 40) })
          .addTo(mapRef.current);
      }
    }

    // Re-fit bounds
    const points: [number, number][] = [
      [data.merchant_lat, data.merchant_lng],
      [data.customer_lat, data.customer_lng],
    ];
    if (data.has_driver) points.push([data.driver_lat, data.driver_lng]);
    mapRef.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15, animate: true });
  }, [data.driver_lat, data.driver_lng, data.has_driver, data.merchant_lat, data.merchant_lng, data.customer_lat, data.customer_lng]);

  const color = STATUS_COLOR[data.status] ?? "#8B5CF6";
  const label = STATUS_LABEL[data.status] ?? data.status;

  return (
    <div className="glass-card overflow-hidden">
      {/* Status banner */}
      <div className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: `1px solid ${color}33` }}>
        <div className="flex items-center gap-2">
          {data.eta_minutes > 0 && data.status !== "delivered" && (
            <span className="text-xs text-vox-muted">{data.eta_minutes} دقيقة</span>
          )}
          {!data.has_driver && data.status === "ready_for_pickup" && (
            <span className="text-[10px] text-amber-400 animate-pulse">يُبحث عن سائق...</span>
          )}
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        </div>
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
      </div>

      {/* Leaflet map */}
      <div ref={containerRef} style={{ height: 240, width: "100%" }} />

      {/* Legend */}
      <div className="flex justify-center gap-5 px-4 py-2 text-[11px] text-vox-muted border-t"
           style={{ borderColor: "#1E1E2E" }}>
        <span>🏪 {data.merchant_name}</span>
        {data.has_driver ? <span>🛵 السائق</span> : <span className="text-amber-400/60">🛵 لا يوجد سائق بعد</span>}
        <span>📍 أنت</span>
      </div>
    </div>
  );
}
