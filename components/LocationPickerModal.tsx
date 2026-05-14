"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { X, MapPin, Loader2, Navigation } from "lucide-react";
import { addressApi } from "@/lib/api";

interface PickedLocation {
  lat: number;
  lng: number;
  full_address: string;
  city: string;
  district: string;
}

interface Props {
  onConfirm: (addressId: string, location: PickedLocation) => void;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function reverseGeocode(lat: number, lng: number): Promise<{ full_address: string; city: string; district: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/users/geocode/reverse?lat=${lat}&lng=${lng}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("vox_token") ?? ""}` } }
    );
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return { full_address: "", city: "", district: "" };
}

export default function LocationPickerModal({ onConfirm, onClose }: Props) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const leafletMap   = useRef<import("leaflet").Map | null>(null);
  const markerRef    = useRef<import("leaflet").Marker | null>(null);

  const [lat, setLat]           = useState<number | null>(null);
  const [lng, setLng]           = useState<number | null>(null);
  const [address, setAddress]   = useState("");
  const [city, setCity]         = useState("");
  const [district, setDistrict] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [locating,  setLocating]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [label,     setLabel]     = useState("منزل");

  const updateAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    const geo = await reverseGeocode(lat, lng);
    setAddress(geo.full_address);
    setCity(geo.city);
    setDistrict(geo.district);
    setGeocoding(false);
  }, []);

  // ── Init Leaflet map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    // Default center: Sanaa
    const defaultLat = 15.3694;
    const defaultLng = 44.1910;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 15,
      zoomControl: true,
    });
    leafletMap.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Draggable pin marker
    const markerIcon = L.divIcon({
      html: `<div style="font-size:40px;line-height:1;filter:drop-shadow(0 3px 10px rgba(109,40,255,.8))">📍</div>`,
      className: "",
      iconAnchor: [20, 40],
    });

    const marker = L.marker([defaultLat, defaultLng], { icon: markerIcon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      updateAddressFromCoords(pos.lat, pos.lng);
    });

    // Click on map moves pin
    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
      updateAddressFromCoords(e.latlng.lat, e.latlng.lng);
    });

    // Auto-detect GPS on open
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 16);
          marker.setLatLng([latitude, longitude]);
          setLat(latitude);
          setLng(longitude);
          updateAddressFromCoords(latitude, longitude);
          setLocating(false);
        },
        () => {
          setLocating(false);
          setLat(defaultLat);
          setLng(defaultLng);
          updateAddressFromCoords(defaultLat, defaultLng);
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      setLat(defaultLat);
      setLng(defaultLng);
      updateAddressFromCoords(defaultLat, defaultLng);
    }

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation || !leafletMap.current || !markerRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        leafletMap.current!.setView([latitude, longitude], 17);
        markerRef.current!.setLatLng([latitude, longitude]);
        setLat(latitude);
        setLng(longitude);
        updateAddressFromCoords(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const confirm = async () => {
    if (!lat || !lng) return;
    setSaving(true);
    try {
      const saved = await addressApi.add({
        label,
        full_address: address,
        city,
        district,
        latitude: lat,
        longitude: lng,
        is_default: false,
      });
      onConfirm(saved.id, { lat, lng, full_address: address, city, district });
    } catch {
      // If API fails, still pass coords to parent
      onConfirm("__temp__", { lat, lng, full_address: address, city, district });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(5,5,15,0.97)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 flex-shrink-0">
        <button onClick={onClose}>
          <X size={22} className="text-white/60" />
        </button>
        <h2 className="text-white font-black text-base">حدد موقعك بدقة</h2>
        <div className="w-6" />
      </div>

      {/* Instructions */}
      <p className="text-white/40 text-xs text-center px-6 pb-2 flex-shrink-0">
        اسحب الدبوس 📍 أو اضغط على الخريطة لتحديد موقعك بدقة
      </p>

      {/* Map */}
      <div className="relative flex-1 mx-4 rounded-2xl overflow-hidden" style={{ minHeight: 0 }}>
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

        {/* Locate me button */}
        <button
          onClick={locateMe}
          disabled={locating}
          className="absolute bottom-4 left-4 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all"
          style={{ background: "rgba(109,40,255,0.9)", color: "#fff", border: "1px solid rgba(109,40,255,0.5)" }}
        >
          {locating
            ? <Loader2 size={13} className="animate-spin" />
            : <Navigation size={13} />}
          موقعي الحالي
        </button>
      </div>

      {/* Address card */}
      <div className="flex-shrink-0 mx-4 mt-3 mb-2 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-vox-purple mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {geocoding || locating ? (
              <div className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-vox-purple" />
                <span className="text-white/40 text-sm">جاري تحديد العنوان...</span>
              </div>
            ) : (
              <p className="text-white text-sm font-semibold leading-relaxed">
                {address || "اضغط على الخريطة لتحديد الموقع"}
              </p>
            )}
            {city && <p className="text-white/40 text-xs mt-0.5">{city}{district ? ` · ${district}` : ""}</p>}
          </div>
        </div>
      </div>

      {/* Label selector */}
      <div className="flex-shrink-0 px-4 mb-3">
        <div className="flex gap-2">
          {["منزل", "عمل", "آخر"].map(l => (
            <button key={l} onClick={() => setLabel(l)}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
              style={label === l
                ? { background: "rgba(109,40,255,0.8)", color: "#fff" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm button */}
      <div className="flex-shrink-0 px-4 pb-10">
        <button
          onClick={confirm}
          disabled={!lat || !lng || geocoding || saving}
          className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#6D28FF,#A855F7)" }}
        >
          {saving ? "جاري الحفظ..." : "تأكيد الموقع"}
        </button>
      </div>
    </div>
  );
}
