"use client";
import { useEffect, useState, useRef } from "react";
import { intelligenceApi, UserImpact } from "@/lib/api";
import { Zap } from "lucide-react";

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * target * 10) / 10);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  const formatted = Number.isInteger(display) ? display : display.toFixed(1);
  return <span>{formatted}{suffix}</span>;
}

const IDENTITY_LINES = [
  "اخترنا لك الأفضل في كل مرة.",
  "أنت من يتخذ قرارات ذكية.",
  "وقتك ثمين — نحن نحميه.",
  "بحثنا وقارنّا نيابةً عنك.",
];

export default function ImpactCard() {
  const [data, setData] = useState<UserImpact | null>(null);
  const [lineIdx] = useState(() => Math.floor(Math.random() * IDENTITY_LINES.length));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    intelligenceApi.impact()
      .then(d => { setData(d); setTimeout(() => setVisible(true), 80); })
      .catch(() => {});
  }, []);

  if (!data || data.total_orders === 0) return null;

  const useMonth = data.this_month.orders > 0;
  const timeH    = useMonth ? data.this_month.time_saved_h : data.time_saved_hours;
  const moneyS   = useMonth ? data.this_month.money_saved  : data.money_saved;
  const voiceN   = useMonth ? data.this_month.voice_used   : data.voice_commands_used;
  const ordersN  = useMonth ? data.this_month.orders       : data.total_orders;

  const stats = [
    { emoji: "⏱️", value: timeH,   unit: "ساعة",  label: "وقت وفرته",        color: "#8B5CF6" },
    { emoji: "💰", value: moneyS,  unit: "ر.س",   label: "توفير ذكي",         color: "#06B6D4" },
    { emoji: "🧠", value: ordersN, unit: "قرار",  label: "قرارات أسرع",       color: "#8B5CF6" },
    { emoji: "🔁", value: voiceN,  unit: "أمر",   label: "صوتي منفّذ",        color: "#06B6D4" },
  ];

  return (
    <div
      className="rounded-3xl border p-5 mb-4 transition-all duration-700"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.09) 0%, rgba(6,182,212,0.05) 100%)",
        borderColor: "rgba(139,92,246,0.28)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-vox-muted">
            {useMonth ? "هذا الشهر" : "منذ البداية"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-white font-black text-sm">ما حققته بفضل فوكسورا</h3>
          <div className="w-7 h-7 rounded-xl bg-vox-purple/20 flex items-center justify-center">
            <Zap size={14} className="text-vox-purple" />
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl p-3.5 text-right"
            style={{ background: "rgba(14,14,22,0.85)", border: "1px solid rgba(30,30,50,0.95)" }}
          >
            <span className="text-xl leading-none">{s.emoji}</span>
            <div className="mt-2 mb-0.5 flex items-baseline justify-end gap-1">
              <span className="text-vox-muted text-xs">{s.unit}</span>
              <span className="text-white font-black text-2xl" style={{ color: i % 2 === 0 ? "#fff" : "#fff" }}>
                <AnimatedNumber target={typeof s.value === "number" ? s.value : 0} />
              </span>
            </div>
            <p className="text-vox-muted text-[11px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Identity line */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.22)" }}
      >
        <span className="text-vox-purple text-sm font-black">✦</span>
        <p className="text-vox-purple text-xs font-semibold leading-relaxed text-right flex-1">
          {IDENTITY_LINES[lineIdx]}
        </p>
      </div>
    </div>
  );
}
