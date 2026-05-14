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
  onEnd: () => void;
}

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
  .replace(/^http/, "ws");

// Simple client-side amplitude check for barge-in detection
const BARGE_IN_RMS = 600;

function rms(pcm: Int16Array): number {
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i];
  return Math.sqrt(sum / pcm.length);
}

export default function CallMode({ sessionId, onEnd }: Props) {
  const wsRef         = useRef<WebSocket | null>(null);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const workletRef    = useRef<AudioWorkletNode | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const playingRef    = useRef(false);
  const isSpeakingRef = useRef(false); // AI is playing audio
  const bargeInSentRef = useRef(false);

  const [callState, setCallState]   = useState<CallState>("connecting");
  const [ttsText, setTtsText]       = useState("");
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted]           = useState(false);
  const muted_ = useRef(false);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Audio playback ─────────────────────────────────────────────────────────
  const playNextInQueue = useCallback(() => {
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
        playNextInQueue();
      } else {
        playingRef.current    = false;
        isSpeakingRef.current = false;
        // tell server we finished playing
        wsRef.current?.send(JSON.stringify({ type: "speaking_done" }));
        setCallState("listening");
      }
    };
    src.start();
  }, []);

  const playBase64Audio = useCallback(async (b64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !b64) return;
    try {
      const bytes  = atob(b64);
      const arr    = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const audioBuf = await ctx.decodeAudioData(arr.buffer);
      audioQueueRef.current.push(audioBuf);
      if (!playingRef.current) playNextInQueue();
    } catch (e) {
      console.error("audio decode failed", e);
    }
  }, [playNextInQueue]);

  const stopPlayback = useCallback(() => {
    audioQueueRef.current = [];
    playingRef.current    = false;
    isSpeakingRef.current = false;
  }, []);

  // ── WebSocket + microphone setup ───────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    const token = typeof window !== "undefined"
      ? (localStorage.getItem("vox_token") ?? "")
      : "";

    const ws = new WebSocket(`${WS_BASE}/api/v1/agent/call/${sessionId}?token=${token}`);
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      if (destroyed) return;
      setCallState("connecting");
    };

    ws.onmessage = async (ev) => {
      if (destroyed) return;
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(ev.data as string); } catch { return; }

      const t = msg.type as string;

      if (t === "ready")      { setCallState("listening"); }
      if (t === "processing") { setCallState("processing"); }
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
        setTtsText(text);
        if (draft) setOrderDraft(draft);
        if (b64) {
          isSpeakingRef.current = true;
          setCallState("speaking");
          await playBase64Audio(b64);
        } else {
          setCallState("listening");
        }
      }
      if (t === "error") {
        setCallState("error");
        setTtsText((msg.message as string) ?? "حدث خطأ");
      }
    };

    ws.onclose = () => { if (!destroyed) setCallState("error"); };

    // ── Microphone ─────────────────────────────────────────────────────────
    let audioCtx: AudioContext;
    let sourceNode: MediaStreamAudioSourceNode;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
        if (destroyed) { stream.getTracks().forEach(t => t.stop()); return; }

        audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        await audioCtx.audioWorklet.addModule("/audio-processor.js");
        const worklet = new AudioWorkletNode(audioCtx, "audio-processor");
        workletRef.current = worklet;

        worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (destroyed || muted_.current) return;
          const pcm = new Int16Array(e.data);

          // Barge-in detection: if AI is speaking and user speaks loudly
          if (isSpeakingRef.current && !bargeInSentRef.current) {
            if (rms(pcm) > BARGE_IN_RMS) {
              bargeInSentRef.current = true;
              stopPlayback();
              ws.send(JSON.stringify({ type: "barge_in" }));
              setCallState("listening");
              return;
            }
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(pcm.buffer);
          }
        };

        sourceNode = audioCtx.createMediaStreamSource(stream);
        sourceNode.connect(worklet);
        worklet.connect(audioCtx.destination);   // needed to keep worklet alive
        // Mute the destination so we don't hear ourselves
        audioCtx.destination.channelCount = 0;
      } catch (err) {
        console.error("mic error", err);
        setCallState("error");
        setTtsText("لا يمكن الوصول إلى الميكروفون");
      }
    })();

    return () => {
      destroyed = true;
      ws.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const next = !muted;
    muted_.current = next;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
  };

  const hangUp = () => {
    wsRef.current?.send(JSON.stringify({ type: "end_call" }));
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
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

  const orbPulse =
    callState === "speaking"   ? "animate-pulse scale-110" :
    callState === "listening"  ? "animate-[breathing_2s_ease-in-out_infinite]" :
    callState === "processing" ? "animate-spin" : "";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between"
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
      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <div className="relative">
          {/* outer glow rings */}
          {callState === "speaking" && (
            <>
              <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                   style={{ background: "rgba(109,40,255,0.5)", transform: "scale(1.5)" }} />
              <div className="absolute inset-0 rounded-full animate-ping opacity-10"
                   style={{ background: "rgba(109,40,255,0.3)", transform: "scale(2)", animationDelay: "0.3s" }} />
            </>
          )}
          <div
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${orbPulse}`}
            style={{
              background:
                callState === "speaking"
                  ? "radial-gradient(circle,#A855F7 0%,#6D28FF 60%,#1e0060 100%)"
                  : callState === "processing"
                  ? "radial-gradient(circle,#7C3AED 0%,#4C1D95 100%)"
                  : "radial-gradient(circle,#3B0764 0%,#1e0060 100%)",
              boxShadow:
                callState === "speaking"
                  ? "0 0 60px rgba(109,40,255,0.8), 0 0 120px rgba(109,40,255,0.3)"
                  : "0 0 30px rgba(109,40,255,0.4)",
            }}
          >
            <span style={{ fontSize: 52 }}>🤖</span>
          </div>
        </div>

        {/* State label */}
        <p className="text-white/70 text-sm font-semibold tracking-wide">
          {stateLabel[callState]}
        </p>

        {/* Last AI response */}
        {ttsText ? (
          <div
            className="mx-6 px-5 py-3 rounded-2xl max-w-xs text-center"
            style={{ background: "rgba(109,40,255,0.15)", border: "1px solid rgba(109,40,255,0.25)" }}
          >
            <p className="text-white/90 text-sm leading-relaxed">{ttsText}</p>
          </div>
        ) : null}

        {/* Order draft summary */}
        {orderDraft && (
          <div
            className="mx-6 px-4 py-3 rounded-2xl w-full max-w-xs"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/50 text-xs mb-1">طلب جاري</p>
            <p className="text-white font-bold text-sm">{orderDraft.merchant_name_ar}</p>
            {orderDraft.items?.slice(0, 3).map((it, i) => (
              <p key={i} className="text-white/60 text-xs mt-0.5">
                {it.qty}× {it.name_ar}
              </p>
            ))}
            {orderDraft.total ? (
              <p className="text-vox-purple font-bold text-sm mt-1">
                الإجمالي: {orderDraft.total.toLocaleString()} ر.ي
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8 pb-16">
        <button
          onClick={toggleMute}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: muted
              ? "rgba(239,68,68,0.2)"
              : "rgba(255,255,255,0.08)",
            border: `1px solid ${muted ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {muted ? (
            <MicOff size={22} className="text-red-400" />
          ) : (
            <Mic size={22} className="text-white/60" />
          )}
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
