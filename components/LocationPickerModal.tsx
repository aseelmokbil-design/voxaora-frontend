"use client";
import { useState, useEffect } from "react";
import { MapPin, Navigation, X, Loader2, CheckCircle2 } from "lucide-react";
import { addressApi, Address } from "@/lib/api";

interface PickedLocation {
  full_address: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
}

interface Props {
  onConfirm: (addrId: string, location: PickedLocation) => void;
  onClose: () => void;
}

export default function LocationPickerModal({ onConfirm, onClose }: Props) {
  const [tab, setTab] = useState<"saved" | "new">("saved");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddrs, setLoadingAddrs] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  // manual form
  const [label, setLabel] = useState("منزلي");
  const [fullAddress, setFullAddress] = useState("");
  const [city, setCity] = useState("صنعاء");
  const [district, setDistrict] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    addressApi.list()
      .then(a => { setAddresses(a); if (a.length === 0) setTab("new"); })
      .catch(() => setTab("new"))
      .finally(() => setLoadingAddrs(false));
  }, []);

  const pickSaved = (addr: Address) => {
    onConfirm(addr.id, {
      full_address: addr.full_address,
      city: addr.city,
      district: addr.district ?? "",
      lat: addr.latitude,
      lng: addr.longitude,
    });
  };

  const useGPS = () => {
    if (!navigator.geolocation) { setLocError("المتصفح لا يدعم GPS"); return; }
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        setTab("new");
      },
      () => { setLocError("تعذّر تحديد موقعك، أدخله يدوياً"); setLocating(false); }
    );
  };

  const confirmNew = () => {
    if (!fullAddress.trim() || !city.trim()) return;
    onConfirm("__temp__", {
      full_address: fullAddress.trim(),
      city: city.trim(),
      district: district.trim(),
      lat: lat ?? 15.3694,
      lng: lng ?? 44.1910,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-[430px] rounded-t-3xl overflow-hidden"
           style={{ background: "#0A0A0F", border: "1px solid rgba(255,255,255,0.08)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={onClose}><X size={20} className="text-vox-muted" /></button>
          <h2 className="text-white font-black text-base">موقع التوصيل</h2>
          <div className="w-5" />
        </div>

        {/* GPS button */}
        <div className="px-5 mb-4">
          <button onClick={useGPS} disabled={locating}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "rgba(109,40,255,0.18)", color: "#A855F7", border: "2px solid rgba(109,40,255,0.4)" }}>
            {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            {locating ? "جارٍ تحديد موقعك..." : "استخدام موقعي الحالي (GPS)"}
          </button>
          {lat && !locating && (
            <p className="text-green-400 text-xs text-center mt-1.5">
              <CheckCircle2 size={11} className="inline mr-1" />
              تم تحديد الموقع — أكمل بيانات العنوان أدناه
            </p>
          )}
          {locError && <p className="text-red-400 text-xs text-center mt-1.5">{locError}</p>}
        </div>

        {/* Tabs */}
        {addresses.length > 0 && (
          <div className="flex mx-5 mb-3 rounded-xl overflow-hidden border border-vox-border">
            {(["saved", "new"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                  tab === t ? "bg-vox-purple text-white" : "text-vox-muted"
                }`}>
                {t === "saved" ? "عناوين محفوظة" : "عنوان جديد"}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 pb-6 max-h-[50vh] overflow-y-auto">
          {tab === "saved" && (
            <div className="space-y-2">
              {loadingAddrs ? (
                <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-vox-purple" /></div>
              ) : addresses.map(a => (
                <button key={a.id} onClick={() => pickSaved(a)}
                  className="w-full p-3.5 rounded-2xl border border-vox-border text-right hover:border-vox-purple transition-all active:scale-[0.98] flex items-start gap-3"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <MapPin size={16} className="text-vox-purple mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm">{a.label}</p>
                    <p className="text-vox-muted text-xs mt-0.5 leading-relaxed">{a.full_address}</p>
                  </div>
                  {a.is_default && <span className="ml-auto text-[10px] text-vox-purple font-bold">افتراضي</span>}
                </button>
              ))}
            </div>
          )}

          {tab === "new" && (
            <div className="space-y-3">
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="اسم العنوان (منزل، عمل...)" dir="rtl"
                className="w-full bg-vox-card border border-vox-border rounded-xl px-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors" />
              <input value={fullAddress} onChange={e => setFullAddress(e.target.value)} placeholder="العنوان التفصيلي *" dir="rtl"
                className="w-full bg-vox-card border border-vox-border rounded-xl px-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors" />
              <div className="grid grid-cols-2 gap-2">
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="المدينة *" dir="rtl"
                  className="bg-vox-card border border-vox-border rounded-xl px-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors" />
                <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="الحي" dir="rtl"
                  className="bg-vox-card border border-vox-border rounded-xl px-4 py-3 text-white placeholder-vox-muted text-sm focus:outline-none focus:border-vox-purple transition-colors" />
              </div>
              <button onClick={confirmNew} disabled={!fullAddress.trim() || !city.trim()}
                className="w-full bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-3.5 font-bold text-white text-sm disabled:opacity-40 transition-opacity active:scale-95">
                تأكيد العنوان
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
