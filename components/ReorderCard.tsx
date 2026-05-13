"use client";
import { useState } from "react";
import { RotateCcw, ChevronLeft, CheckCircle } from "lucide-react";
import { intelligenceApi, ReorderSuggestion } from "@/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Props {
  suggestions: ReorderSuggestion[];
  onSpeak?: (text: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "اليوم";
  if (d === 1) return "أمس";
  if (d < 7)  return `منذ ${d} أيام`;
  return `منذ ${Math.floor(d / 7)} أسابيع`;
}

export default function ReorderCard({ suggestions, onSpeak }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleReorder = async (s: ReorderSuggestion) => {
    if (!s.merchant_is_open) return;
    setLoading(s.order_id);
    try {
      const res = await intelligenceApi.reorder(s.order_id);
      setDone(s.order_id);
      if (onSpeak) onSpeak(res.tts_response);
      setTimeout(() => router.push(`/orders/${res.order_id}`), 1800);
    } catch {
      setLoading(null);
      if (onSpeak) onSpeak("عذراً، لم نتمكن من إعادة الطلب. جرب مجدداً.");
    }
  };

  if (!suggestions.length) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={() => router.push("/orders")}
          className="flex items-center gap-1 text-vox-muted text-xs hover:text-white transition-colors">
          <ChevronLeft size={12} /> عرض الكل
        </button>
        <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
          <RotateCcw size={14} className="text-vox-purple" /> اطلب مجدداً
        </h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: "none" }}>
        {suggestions.map(s => {
          const isLoading = loading === s.order_id;
          const isDone    = done === s.order_id;

          return (
            <div key={s.order_id}
              className="flex-shrink-0 snap-start rounded-2xl border p-3 w-44 transition-all"
              style={{ background: "rgba(18,18,26,0.95)", borderColor: "rgba(30,30,46,0.9)" }}>
              {/* Merchant logo */}
              <div className="flex items-center gap-2 mb-2">
                {s.merchant_logo ? (
                  <Image src={s.merchant_logo} alt={s.merchant_name} width={28} height={28}
                    className="rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-vox-purple/20 flex items-center justify-center text-sm">🏪</div>
                )}
                <span className="text-white text-xs font-semibold truncate">{s.merchant_name}</span>
              </div>

              <p className="text-vox-muted text-[11px] mb-1 line-clamp-2 text-right leading-relaxed">
                {s.items_summary}
              </p>
              <p className="text-vox-muted text-[10px] mb-3 text-right">
                {timeAgo(s.created_at)} · {s.total_amount?.toFixed(0)} ر.س
              </p>

              <button
                onClick={() => handleReorder(s)}
                disabled={isLoading || isDone || !s.merchant_is_open}
                className="w-full rounded-xl py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: isDone ? "rgba(34,197,94,0.2)" : s.merchant_is_open ? "rgba(139,92,246,0.25)" : "rgba(30,30,46,0.6)",
                  color: isDone ? "#22C55E" : s.merchant_is_open ? "#8B5CF6" : "#6B7280",
                  border: `1px solid ${isDone ? "rgba(34,197,94,0.4)" : s.merchant_is_open ? "rgba(139,92,246,0.4)" : "rgba(30,30,46,0.6)"}`,
                }}>
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border border-vox-purple border-t-transparent rounded-full animate-spin" />
                ) : isDone ? (
                  <><CheckCircle size={12} /> تم!</>
                ) : s.merchant_is_open ? (
                  <><RotateCcw size={12} /> أعد الطلب</>
                ) : (
                  "مغلق الآن"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
