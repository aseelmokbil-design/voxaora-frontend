"use client";
import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: "square" | "wide";
}

export default function ImageUploader({ value, onChange, label = "صورة", aspect = "wide" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const url = await adminApi.uploadImage(file);
      onChange(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const h = aspect === "square" ? "h-28 w-28" : "h-32 w-full";

  return (
    <div>
      {label && <p className="text-white/60 text-xs mb-2 text-right">{label}</p>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`${h} relative rounded-2xl border-2 border-dashed border-white/15 bg-white/3 cursor-pointer
          hover:border-vox-purple/50 hover:bg-vox-purple/5 transition-all overflow-hidden flex items-center justify-center`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload size={20} className="text-white" />
            </div>
            <button
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 left-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X size={12} className="text-white" />
            </button>
          </>
        ) : uploading ? (
          <Loader2 size={22} className="text-vox-purple animate-spin" />
        ) : (
          <div className="text-center">
            <Upload size={20} className="text-white/30 mx-auto mb-1" />
            <p className="text-white/30 text-xs">ارفع صورة</p>
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1 text-right">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
