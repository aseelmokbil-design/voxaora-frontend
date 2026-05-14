"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { PhoneOff, Mic, MicOff } from "lucide-react";

type CallState = "connecting" | "listening" | "processing" | "speaking" | "error";

interface OrderDraft {
  merchant_name_ar?: string;
  total?: number;
  items?: { name_ar: string; qty: number; unit_price: number }[];
}

interface Props {
  sessionId: string;
  stream: MediaStream;     // acquired by parent in the button click handler
  onEnd: () => void;
}

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/^https?/, m => (m === "https" ? "wss" : "ws"));

// RMS threshold for barge-in: user speaking while AI plays audio
const BARGE_IN_RMS = 500;

function calcRms(pcm: Int16Array): number {
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
  return Math.sqrt(sum / (pcm.length || 1));
}

export default function CallMode({ sessionId, stream, onEnd }: Props) {
  const wsRef          = useRef<WebSocket | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const workletRef     = useRef<AudioWorkletNode | null>(null);
  const sourceRef      = useRef<MediaStreamAudioSourceNode | null>(null);
  const isSpeakingRef  = useRef(false);
  const bargeInSentRef = useRef(false);
  const playingRef     = useRef(false);
  const audioQueueRef  = useRef<AudioBuffer[]>([]);

  const [callState, setCallState]     = useState<CallState>("connecting");
  const [ttsText, setTtsText]         = useState("");
  const [orderDraft, setOrderDraft]   = useState<OrderDraft | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted]             = useState(false);
  const mutedRef = useRef(false);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    const t = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Audio playback ─────────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || audioQueueRef.current.length === 0) {
      playingRef.current = false;
      return;
    }
    playingRef.current = true;
    const buf = audioQueueRef.current.shift()!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNext();
      } else {
        playingRef.current    = false;
        isSpeakingRef.current = false;
        wsRef.current?.send(JSON.stringify({ type: "speaking_done" }));
        setCallState("listening");
      }
    };
    src.start();
  }, []);

  const enqueueAudio = useCallback(async (b64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !b64) return;
    try {
      const raw  = atob(b64);
      const arr  = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const buf  = await ctx.decodeAudioData(arr.buffer);
      audioQueueRef.current.push(buf);
      if (!playingRef.current) playNext();
    } catch (e) {
      console.error("audio decode failed", e);
    }
  }, [playNext]);

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    playingRef.current    = false;
    isSpeakingRef.current = false;
  }, []);

  // ── WebSocket + AudioWorklet setup ─────────────────────────────────────────
  useEffect(() => {
    let dead = false;

    const token = typeof window !== "undefined"
      ? (localStorage.getItem("vox_token") ?? "")
      : "";

    // ── WebSocket ──────────────────────────────────────────────────────────
    const ws = new WebSocket(`${WS_BASE}/api/v1/agent/call/${sessionId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen  = () => { if (!dead) setCallState("connecting"); };
    ws.onclose = () => { if (!dead) setCallState("error"); };
    ws.onerror = (e) => { console.error("ws error", e); if (!dead) setCallState("error"); };

    ws.onmessage = async (ev) => {
      if (dead) return;
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(ev.data as string); } catch { return; }

      const t = msg.type as string;
      if (t === "ready")        setCallState("listening");
      if (t === "processing")   setCallState("processing");
      if (t === "listening")  { setCallState("listening"); bargeInSentRef.current = false; }
      if (t === "barge_in_ack") {
        stopPlayback();
        setCallState("listening");
        bargeInSentRef.current = false;
      }
      if (t === "audio_end") {
        const b64   = (msg.audio_base64 as string) ?? "";
        const text  = (msg.tts         as string) ?? "";
        const draft = msg.order_draft   as OrderDraft | null;
        if (text)  setTtsText(text);
        if (draft) setOrderDraft(draft);
        if (b64) {
          isSpeakingRef.current = true;
          setCallState("speaking");
          await enqueueAudio(b64);
        } else {
          setCallState("listening");
        }
      }
      if (t === "error") {
        setCallState("error");
        setTtsText((msg.message as string) ?? "حدث خطأ");
      }
    };

    // ── AudioWorklet with the pre-acquired stream ──────────────────────────
    (async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        await ctx.audioWorklet.addModule("/audio-processor.js");
        const worklet = new AudioWorkletNode(ctx, "audio-processor");
        workletRef.current = worklet;

        worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (dead || mutedRef.current) return;
          const pcm = new Int16Array(e.data);

          // Barge-in: user speaks while AI is playing
          if (isSpeakingRef.current && !bargeInSentRef.current && calcRms(pcm) > BARGE_IN_RMS) {
            bargeInSentRef.current = true;
            stopPlayback();
            ws.send(JSON.stringify({ type: "barge_in" }));
            return;
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(pcm.buffer);
          }
        };

        // Use the stream provided by parent (already permitted)
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Route: mic → worklet → silent gain → destination (keeps graph alive without echo)
        const silentGain    = ctx.createGain();
        silentGain.gain.value = 0;
        source.connect(worklet);
        worklet.connect(silentGain);
        silentGain.connect(ctx.destination);

      } catch (e) {
        console.error("AudioWorklet setup failed", e);
        if (!dead) {
          setCallState("error");
          setTtsText("فشل تشغيل الميكروفون — أعد تحميل الصفحة وحاول مجدداً");
        }
      }
    })();

    return () => {
      dead = true;
      ws.close();
      audioCtxRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    stream.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  const hangUp = () => {
    wsRef.current?.send(JSON.stringify({ type: "end_call" }));
    wsRef.current?.close();
    audioCtxRef.current?.close();
    onEnd();
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  const stateLabel: Record<CallState, string> = {
    connecting: "جاري الاتصال...",
    listening:  "أنا أسمعك...",
    processing: "جاري التحليل...",
    speaking:   "المساعد يتحدث",
    error:      "انقطع الاتصال",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none"
      style={{ background: "linear-gradient(180deg,#08041A 0%,#050510 100%)" }}
      dir="rtl"
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-6 pt-10 pb-4">
        <span className="text-white/30 text-sm font-mono">{fmt(callDuration)}</span>
        <span className="text-white/60 text-xs tracking-widest font-bold">VOXAORA</span>
        <div className="w-12" />
      </div>

      {/* Orb */}
      <div className="flex flex-col items-center gap-6 flex-1 justify-center w-full px-6">
        <div className="relative flex items-center justify-center">
          {callState === "speaking" && (
            <>
              <div className="absolute rounded-full animate-ping opacity-20"
                   style={{ width: 220, height: 220, background: "rgba(109,40,255,0.5)" }} />
              <div className="absolute rounded-full animate-ping opacity-10"
                   style={{ width: 280, height: 280, background: "rgba(109,40,255,0.3)", animationDelay: "0.4s" }} />
            </>
          )}
          <div
            className="w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background:
                callState === "speaking"
                  ? "radial-gradient(circle,#A855F7 0%,#6D28FF 60%,#1e0060 100%)"
                  : callState === "processing"
                  ? "radial-gradient(circle,#7C3AED 0%,#4C1D95 100%)"
                  : callState === "error"
                  ? "radial-gradient(circle,#7f1d1d 0%,#450a0a 100%)"
                  : "radial-gradient(circle,#3B0764 0%,#1e0060 100%)",
              boxShadow:
                callState === "speaking"
                  ? "0 0 60px rgba(109,40,255,0.8), 0 0 120px rgba(109,40,255,0.3)"
                  : callState === "error"
                  ? "0 0 30px rgba(220,38,38,0.4)"
                  : "0 0 30px rgba(109,40,255,0.4)",
              animation:
                callState === "speaking"  ? "pulse 1.5s ease-in-out infinite" :
                callState === "processing" ? "spin 1s linear infinite" : undefined,
            }}
          >
            <span style={{ fontSize: 52 }}>
              {callState === "error" ? "⚠️" : "🤖"}
            </span>
          </div>
        </div>

        <p className="text-white/70 text-sm font-semibold tracking-wide">
          {stateLabel[callState]}
        </p>

        {ttsText ? (
          <div
            className="px-5 py-3 rounded-2xl w-full max-w-sm text-center"
            style={{ background: "rgba(109,40,255,0.15)", border: "1px solid rgba(109,40,255,0.25)" }}
          >
            <p className="text-white/90 text-sm leading-relaxed">{ttsText}</p>
          </div>
        ) : null}

        {orderDraft && (
          <div
            className="px-4 py-3 rounded-2xl w-full max-w-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/50 text-xs mb-1">طلب جاري</p>
            <p className="text-white font-bold text-sm">{orderDraft.merchant_name_ar}</p>
            {orderDraft.items?.slice(0, 3).map((it, i) => (
              <p key={i} className="text-white/60 text-xs mt-0.5">{it.qty}× {it.name_ar}</p>
            ))}
            {orderDraft.total != null && (
              <p className="text-purple-400 font-bold text-sm mt-1">
                الإجمالي: {orderDraft.total.toLocaleString()} ر.ي
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8 pb-16">
        <button
          onClick={toggleMute}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: muted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${muted ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {muted
            ? <MicOff size={22} className="text-red-400" />
            : <Mic    size={22} className="text-white/60" />}
        </button>

        <button
          onClick={hangUp}
          className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-all"
          style={{
            background: "linear-gradient(135deg,#DC2626,#991B1B)",
            boxShadow: "0 0 30px rgba(220,38,38,0.5)",
          }}
        >
          <PhoneOff size={28} className="text-white" />
        </button>

        <div className="w-14 h-14" />
      </div>
    </div>
  );
}
