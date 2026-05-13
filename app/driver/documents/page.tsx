"use client";
import { useState, useEffect, useRef } from "react";
import { driverApi, DriverDoc } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Upload, CheckCircle, Clock, XCircle, FileText } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_STYLES = {
  pending:  { label: "قيد المراجعة", icon: <Clock size={12} />,         color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  approved: { label: "معتمد",        icon: <CheckCircle size={12} />,    color: "#22C55E", bg: "rgba(34,197,94,0.1)" },
  rejected: { label: "مرفوض",        icon: <XCircle size={12} />,        color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
};

const REQUIRED_DOCS = [
  { key: "id_card",       label: "بطاقة الهوية",          emoji: "🪪" },
  { key: "license",       label: "رخصة القيادة",           emoji: "📋" },
  { key: "vehicle_front", label: "صورة المركبة (أمام)",    emoji: "🏍️" },
  { key: "vehicle_back",  label: "صورة المركبة (خلف)",     emoji: "🚗" },
  { key: "selfie",        label: "صورة شخصية",             emoji: "🤳" },
];

export default function DriverDocumentsPage() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Record<string, DriverDoc>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = () => {
    setLoading(true);
    driverApi.documents()
      .then(r => {
        const map: Record<string, DriverDoc> = {};
        r.documents.forEach(d => { map[d.doc_type] = d; });
        setDocs(map);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFile = async (docType: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast("حجم الملف لا يتجاوز 10MB", "error");
      return;
    }
    setUploadingKey(docType);
    try {
      await driverApi.uploadDoc(docType, file);
      toast("تم رفع المستند بنجاح", "success");
      load();
    } catch {
      toast("فشل رفع المستند", "error");
    } finally { setUploadingKey(null); }
  };

  if (loading) {
    return (
      <div className="p-5 pt-10 space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    );
  }

  const uploadedCount = Object.keys(docs).length;
  const totalCount    = REQUIRED_DOCS.length;

  return (
    <div className="px-4 pt-10 pb-6" dir="rtl">
      <div className="mb-5">
        <h1 className="text-white font-black text-2xl">المستندات</h1>
        <p className="text-white/40 text-sm mt-0.5">{uploadedCount} / {totalCount} مستندات مرفوعة</p>
      </div>

      {/* Progress */}
      <div className="w-full h-2 rounded-full mb-6" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-2 rounded-full transition-all"
          style={{
            width: `${(uploadedCount / totalCount) * 100}%`,
            background: uploadedCount === totalCount ? "#22C55E" : "linear-gradient(90deg,#6D28FF,#A855F7)",
          }} />
      </div>

      {/* Document cards */}
      <div className="space-y-3">
        {REQUIRED_DOCS.map(({ key, label, emoji }) => {
          const doc    = docs[key];
          const status = doc?.status as keyof typeof STATUS_STYLES | undefined;
          const st     = status ? STATUS_STYLES[status] : null;
          const uploading = uploadingKey === key;

          return (
            <div key={key} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-start gap-3">
                {/* Preview / icon */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  {doc?.file_url
                    ? doc.file_url.match(/\.(pdf)$/i)
                      ? <FileText size={24} className="text-white/40" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={`${API}${doc.file_url}`} alt="" className="w-full h-full object-cover" />
                    : emoji}
                </div>

                <div className="flex-1">
                  <p className="text-white font-bold text-sm">{label}</p>
                  {st ? (
                    <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full w-fit"
                      style={{ background: st.bg, color: st.color }}>
                      {st.icon}
                      <span className="text-[10px] font-bold">{st.label}</span>
                    </div>
                  ) : (
                    <p className="text-white/30 text-xs mt-1">لم يُرفع بعد</p>
                  )}
                  {doc?.notes && (
                    <p className="text-red-400 text-[10px] mt-1">{doc.notes}</p>
                  )}
                </div>

                {/* Upload button */}
                <div>
                  <input
                    ref={el => { inputRefs.current[key] = el; }}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(key, file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => inputRefs.current[key]?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    style={{ background: "rgba(109,40,255,0.15)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.25)" }}>
                    {uploading ? (
                      <div className="w-3 h-3 border border-purple-400/50 border-t-purple-400 rounded-full animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    {doc ? "تحديث" : "رفع"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notice */}
      <div className="mt-4 rounded-2xl p-4"
        style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <p className="text-blue-400 text-xs">
          المستندات المقبولة: JPG, PNG, WebP, PDF · الحد الأقصى: 10MB لكل ملف
        </p>
      </div>
    </div>
  );
}
