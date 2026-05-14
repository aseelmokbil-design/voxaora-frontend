"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, Square, X, CheckCircle, RotateCcw, ShoppingCart,
  Loader2, MessageSquare, Clock, Star, Truck,
} from "lucide-react";
import { agentApi, AgentTurnResponse, AgentOrderDraft } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import clsx from "clsx";

// ─── Agent states from backend ───────────────────────────────────────────────
type AgentState =
  | "listening" | "recommending" | "clarifying" | "confirming"
  | "dispatching" | "tracking" | "delivered" | "cancelled";

// ─── Local UI states ─────────────────────────────────────────────────────────
type Phase =
  | "idle"           // no session yet
  | "starting"       // creating session
  | "recording"      // mic open
  | "processing"     // waiting for backend
  | "agent"          // showing agent response, waiting for next turn
  | "confirming"     // order summary visible
  | "clarifying"     // clarification buttons visible
  | "done"           // order dispatched
  | "tracking"       // tracking order
  | "error";

interface Props { lat?: number; lng?: number; }

// ─── Audio engine ─────────────────────────────────────────────────────────────
let _audioEl: HTMLAudioElement | null = null;
let _onAudioDone: (() => void) | null = null;

function unlockAudio(): void {
  if (typeof window === "undefined" || _audioEl) return;
  try {
    _audioEl = new Audio();
    _audioEl.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    _audioEl.play().catch(() => {});
  } catch { /* */ }
}

function stopAudio(): void {
  _onAudioDone = null;
  try { _audioEl?.pause(); if (_audioEl) _audioEl.currentTime = 0; } catch { /* */ }
  try { window.speechSynthesis?.cancel(); } catch { /* */ }
}

function playBase64(b64: string, onDone?: () => void): void {
  if (!b64) { onDone?.(); return; }
  _onAudioDone = onDone ?? null;
  try {
    const el = _audioEl ?? (() => { _audioEl = new Audio(); return _audioEl; })();
    el.pause();
    el.onended = () => { const cb = _onAudioDone; _onAudioDone = null; cb?.(); };
    el.onerror = () => { const cb = _onAudioDone; _onAudioDone = null; cb?.(); };
    el.src = `data:audio/mp3;base64,${b64}`;
    el.play().catch(() => {
      try {
        const a2 = new Audio(`data:audio/mp3;base64,${b64}`);
        a2.onended = () => { const cb = _onAudioDone; _onAudioDone = null; cb?.(); };
        a2.play().catch(() => {});
      } catch { /* */ }
    });
  } catch { /* */ }
}

function speakBrowser(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA"; u.rate = 0.88;
    window.speechSynthesis.speak(u);
  } catch { /* */ }
}

function speak(text: string, b64?: string | null, onDone?: () => void): void {
  if (b64) { playBase64(b64, onDone); }
  else { speakBrowser(text); onDone?.(); }
}

const haptic = (p: number | number[]) => {
  try { navigator.vibrate?.(p); } catch { /* */ }
};

// ─── State labels ────────────────────────────────────────────────────────────
const STATE_LABELS: Record<AgentState, string> = {
  listening:    "🎙️ أنا أسمعك...",
  recommending: "🔍 وجدت لك أفضل خيار",
  clarifying:   "❓ سؤال سريع",
  confirming:   "📋 تأكيد الطلب",
  dispatching:  "✅ جارٍ إرسال الطلب",
  tracking:     "🛵 طلبك في الطريق",
  delivered:    "🎉 وصل طلبك!",
  cancelled:    "❌ تم الإلغاء",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceOrb({ lat = 15.3694, lng = 44.1910 }: Props) {
  const { user } = useAuth();
  const router   = useRouter();

  const [phase,       setPhase]       = useState<Phase>("idle");
  const [sessionId,   setSessionId]   = useState("");
  const [agentState,  setAgentState]  = useState<AgentState>("listening");
  const [ttsText,     setTtsText]     = useState("اضغط وتحدث، أنا أسمعك.");
  const [orderDraft,  setOrderDraft]  = useState<AgentOrderDraft | null>(null);
  const [orderId,     setOrderId]     = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [clarOpts,    setClarOpts]    = useState<string[]>([]);
  const [missingItems,setMissingItems]= useState<string[]>([]);
  const [alts,        setAlts]        = useState<AgentTurnResponse["alternatives"]>({});
  const [coverage,    setCoverage]    = useState(1.0);
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [recSecs,     setRecSecs]     = useState(0);
  const [textInput,   setTextInput]   = useState("");
  const [error,       setError]       = useState("");
  const [autoRecord,  setAutoRecord]  = useState(false);

  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const analyserRef= useRef<AnalyserNode | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef    = useRef<number>(0);
  const sessionRef = useRef("");

  // keep sessionRef in sync
  useEffect(() => { sessionRef.current = sessionId; }, [sessionId]);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // ── Apply backend turn response ─────────────────────────────────────────────
  const applyTurn = useCallback((r: AgentTurnResponse, autoRecordAfter = false) => {
    setSessionId(r.session_id);
    setAgentState(r.state as AgentState);
    setTtsText(r.tts);
    if (r.order_draft)   setOrderDraft(r.order_draft);
    if (r.order_id)      setOrderId(r.order_id);
    if (r.order_number)  setOrderNumber(r.order_number);
    setClarOpts(r.clarification_options || []);
    setMissingItems(r.missing_items || []);
    setAlts(r.alternatives || {});
    setCoverage(r.coverage_pct ?? 1.0);

    const state = r.state as AgentState;

    if (state === "dispatching" || state === "tracking") {
      setPhase("done");
      haptic([30, 80, 150]);
      speak(r.tts, r.audio_base64, () => {
        setTimeout(() => router.push(`/orders/${r.order_id}`), 2500);
      });
      return;
    }
    if (state === "delivered") {
      setPhase("done");
      speak(r.tts, r.audio_base64);
      return;
    }
    if (state === "cancelled") {
      setPhase("idle");
      speak(r.tts, r.audio_base64);
      return;
    }
    if (state === "clarifying") {
      setPhase("clarifying");
      speak(r.tts, r.audio_base64);
      return;
    }
    if (state === "confirming") {
      setPhase("confirming");
      speak(r.tts, r.audio_base64);
      return;
    }

    // recommending / listening → agent phase, auto-record after TTS
    setPhase("agent");
    speak(r.tts, r.audio_base64, autoRecordAfter ? () => {
      setTimeout(() => setAutoRecord(true), 700);
    } : undefined);
  }, [router]);

  // ── Auto-record trigger ─────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRecord && phase === "agent") {
      setAutoRecord(false);
      startRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRecord, phase]);

  // ── Start session ───────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!user) { router.push("/auth/login"); return; }
    unlockAudio();
    setPhase("starting");
    setError("");
    try {
      const res = await agentApi.startSession(lat, lng);
      setSessionId(res.session_id);
      setAgentState("listening");
      setTtsText(res.tts);
      speak(res.tts, res.audio_base64, () => {
        setTimeout(() => setAutoRecord(true), 400);
      });
      setPhase("agent");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "فشل في بدء الجلسة";
      setError(msg); setPhase("error");
    }
  }, [user, lat, lng, router]);

  // ── Recording ───────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!sessionRef.current) return;
    unlockAudio();
    stopAudio();
    setPhase("recording");
    setError("");
    setRecSecs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      const src    = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const track = () => {
        if (!analyserRef.current) return;
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        setAudioLevel(buf.reduce((s, v) => s + v, 0) / buf.length);
        animRef.current = requestAnimationFrame(track);
      };
      animRef.current = requestAnimationFrame(track);

      timerRef.current = setInterval(() => {
        setRecSecs(s => { if (s >= 29) { mediaRef.current?.stop(); return s; } return s + 1; });
      }, 1000);

      const mime = ["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/mp4",""]
        .find(m => !m || MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stopTimer();
        cancelAnimationFrame(animRef.current);
        stream.getTracks().forEach(t => t.stop());
        analyserRef.current = null;
        setAudioLevel(0);
        setPhase("processing");

        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        if (blob.size < 800) {
          setPhase("agent");
          speak("ما سمعتك. تحدث بوضوح وقرب من الميكروفون.", undefined);
          return;
        }

        try {
          const r = await agentApi.audioTurn(sessionRef.current, blob, lat, lng);
          applyTurn(r, r.state === "recommending");
        } catch (e) {
          const status = (e as { status?: number }).status;
          const msg    = e instanceof Error ? e.message : "خطأ غير متوقع";
          if (status === 401 || status === 403) {
            localStorage.removeItem("vox_token");
            router.push("/auth/login");
            return;
          }
          if (status === 422 || msg.includes("فهم")) {
            setPhase("agent");
            speak("ما فهمت زين. قول طلبك مرة ثانية.", undefined);
          } else {
            setError(msg); setPhase("error");
          }
        }
      };

      mediaRef.current = recorder;
      recorder.start(250);
    } catch {
      setError("لا يمكن الوصول للميكروفون. تحقق من الإذن.");
      setPhase("error");
    }
  }, [lat, lng, router, applyTurn]);

  const stopRecording = useCallback(() => { mediaRef.current?.stop(); }, []);

  // ── Text submit ─────────────────────────────────────────────────────────────
  const submitText = useCallback(async () => {
    if (!textInput.trim() || !user) return;
    unlockAudio();

    // If no session yet, start one
    let sid = sessionRef.current;
    if (!sid) {
      try {
        const s = await agentApi.startSession(lat, lng);
        sid = s.session_id;
        setSessionId(sid);
      } catch {
        setError("فشل في بدء الجلسة"); return;
      }
    }

    setPhase("processing");
    const text = textInput; setTextInput("");
    try {
      const r = await agentApi.textTurn(sid, text, lat, lng);
      applyTurn(r, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ";
      setError(msg); setPhase("error");
    }
  }, [textInput, user, lat, lng, applyTurn]);

  // ── Clarification button click ──────────────────────────────────────────────
  const sendClarification = useCallback(async (answer: string) => {
    if (!sessionRef.current) return;
    setPhase("processing");
    try {
      const r = await agentApi.textTurn(sessionRef.current, answer, lat, lng);
      applyTurn(r, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ";
      setError(msg); setPhase("error");
    }
  }, [lat, lng, applyTurn]);

  // ── Confirm / Cancel ────────────────────────────────────────────────────────
  const confirmOrder = useCallback(() => sendClarification("نعم"), [sendClarification]);
  const cancelOrder  = useCallback(() => sendClarification("لا"),  [sendClarification]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopAudio();
    mediaRef.current?.stop();
    cancelAnimationFrame(animRef.current);
    stopTimer();
    setPhase("idle"); setSessionId(""); setAgentState("listening");
    setTtsText("اضغط وتحدث، أنا أسمعك."); setError(""); setTextInput("");
    setOrderDraft(null); setOrderId(""); setOrderNumber("");
    setClarOpts([]); setMissingItems([]); setAlts({});
    setAudioLevel(0); setRecSecs(0); setCoverage(1.0);
  }, []);

  // ─── Visual ───────────────────────────────────────────────────────────────
  const ringScale = 1 + (audioLevel / 255) * 1.8;

  return (
    <div className="flex flex-col items-center w-full gap-3">

      {/* ── Orb ─────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center mb-2">
        {/* Idle pulse rings */}
        {phase === "idle" && (
          <><div className="absolute w-36 h-36 rounded-full bg-vox-purple/10 orb-ring" />
            <div className="absolute w-36 h-36 rounded-full bg-vox-purple/10 orb-ring orb-ring-2" /></>
        )}
        {/* Recording level ring */}
        {phase === "recording" && (
          <div className="absolute w-36 h-36 rounded-full bg-red-500/20 transition-transform duration-75"
               style={{ transform: `scale(${ringScale})` }} />
        )}

        <button
          onClick={
            phase === "idle"      ? startSession :
            phase === "agent"     ? startRecording :
            phase === "recording" ? stopRecording :
            phase === "error"     ? reset : undefined
          }
          disabled={["starting","processing","done","clarifying","confirming","tracking"].includes(phase)}
          className={clsx(
            "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300",
            "text-white relative z-10 select-none",
            phase === "idle"       && "bg-gradient-to-br from-vox-purple to-vox-blue glow-purple hover:scale-105 active:scale-95 cursor-pointer",
            phase === "starting"   && "bg-vox-card border-2 border-vox-purple/60",
            phase === "recording"  && "bg-red-600 recording-glow cursor-pointer",
            phase === "processing" && "bg-vox-card border-2 border-vox-purple/60",
            phase === "agent"      && "bg-gradient-to-br from-vox-purple to-vox-blue glow-purple hover:scale-105 active:scale-95 cursor-pointer",
            phase === "clarifying" && "bg-vox-card border-2 border-yellow-400/60",
            phase === "confirming" && "bg-vox-card border-2 border-vox-cyan/60",
            phase === "done"       && "bg-green-600 glow-cyan",
            phase === "tracking"   && "bg-vox-card border-2 border-vox-cyan/60",
            phase === "error"      && "bg-red-900 border border-red-500 cursor-pointer hover:opacity-80",
          )}>
          {phase === "idle"       && <Mic size={48} />}
          {phase === "starting"   && <Loader2 size={36} className="animate-spin text-vox-purple" />}
          {phase === "recording"  && (
            <div className="flex flex-col items-center gap-1">
              <Square size={28} className="fill-white" />
              <span className="text-xs font-bold">{recSecs}ث</span>
            </div>
          )}
          {phase === "processing" && <Loader2 size={36} className="animate-spin text-vox-purple" />}
          {phase === "agent"      && <Mic size={40} />}
          {phase === "clarifying" && <MessageSquare size={36} className="text-yellow-400" />}
          {phase === "confirming" && <CheckCircle size={36} className="text-vox-cyan" />}
          {phase === "done"       && <CheckCircle size={48} />}
          {phase === "tracking"   && <Truck size={36} className="text-vox-cyan" />}
          {phase === "error"      && <RotateCcw size={36} className="text-red-400" />}
        </button>
      </div>

      {/* ── State badge ─────────────────────────────────────────────────── */}
      {phase !== "idle" && phase !== "error" && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-vox-card border border-vox-border text-xs text-vox-muted">
          {STATE_LABELS[agentState] || agentState}
        </div>
      )}

      {/* ── TTS bubble ──────────────────────────────────────────────────── */}
      {ttsText && phase !== "idle" && phase !== "error" && (
        <div className="w-full px-2">
          <div className="rounded-2xl p-3.5 border border-vox-cyan/20" style={{ background:"rgba(6,182,212,0.05)" }}>
            <div className="flex gap-2" dir="rtl">
              <span className="text-vox-cyan text-lg flex-shrink-0">🤖</span>
              <p className="text-vox-cyan text-sm leading-relaxed">{ttsText}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recording waveform ──────────────────────────────────────────── */}
      {phase === "recording" && (
        <div className="flex gap-0.5 justify-center items-end h-6 px-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1 rounded-full bg-red-400 transition-all duration-75"
                 style={{ height: `${Math.max(15, (audioLevel / 255) * 100 * (0.3 + Math.abs(Math.sin(i * 0.7 + Date.now() / 200)) * 0.7))}%` }} />
          ))}
        </div>
      )}

      {/* ── Missing items + alternatives ────────────────────────────────── */}
      {missingItems.length > 0 && (
        <div className="w-full px-2">
          <div className="rounded-2xl p-3 border border-orange-400/30 bg-orange-400/5" dir="rtl">
            <p className="text-orange-400 text-xs font-bold mb-2">⚠️ غير متوفر في هذا المطعم:</p>
            {missingItems.map((item, i) => {
              const altList = alts[item];
              return (
                <div key={i} className="mb-1.5">
                  <span className="text-orange-300 text-xs">• {item}</span>
                  {altList && altList.length > 0 && (
                    <span className="text-vox-muted text-xs mr-2">
                      → بديل: {altList[0].product_name_ar} ({altList[0].merchant_name_ar})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Clarification buttons ────────────────────────────────────────── */}
      {phase === "clarifying" && clarOpts.length > 0 && (
        <div className="w-full px-2">
          <div className="rounded-2xl p-3 border border-yellow-400/30 bg-yellow-400/5">
            <p className="text-yellow-400 text-xs font-bold mb-2 text-right">اختر أو قل إجابتك:</p>
            <div className="flex flex-wrap gap-2 justify-end">
              {clarOpts.map((opt, i) => (
                <button key={i} onClick={() => sendClarification(opt)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-yellow-600/30 border border-yellow-400/50 hover:bg-yellow-600/50 transition-colors">
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Order summary / confirm ──────────────────────────────────────── */}
      {phase === "confirming" && orderDraft && (
        <div className="w-full px-2 slide-up">
          <div className="rounded-2xl border border-vox-cyan/30 overflow-hidden"
               style={{ background:"rgba(6,182,212,0.05)" }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-vox-cyan/20 flex items-center justify-between" dir="rtl">
              <span className="text-white font-black text-sm">{orderDraft.merchant_name_ar}</span>
              <div className="flex items-center gap-3 text-xs text-vox-muted">
                <span className="flex items-center gap-1"><Clock size={11} />{orderDraft.eta_minutes}د</span>
                {coverage < 1 && (
                  <span className="text-orange-400">{Math.round(coverage * 100)}% تغطية</span>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="px-4 py-2 space-y-1" dir="rtl">
              {orderDraft.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 text-xs">{it.qty > 1 ? `×${it.qty}` : ""} {it.unit_price.toLocaleString()} ر.ي</span>
                  <span className="text-white font-medium">{it.name_ar}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-4 py-3 border-t border-vox-cyan/20 space-y-1" dir="rtl">
              <div className="flex justify-between text-xs text-vox-muted">
                <span>{orderDraft.subtotal.toLocaleString()} ر.ي</span><span>المجموع الجزئي</span>
              </div>
              {orderDraft.delivery_fee > 0 && (
                <div className="flex justify-between text-xs text-vox-muted">
                  <span>{orderDraft.delivery_fee.toLocaleString()} ر.ي</span><span>التوصيل</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-vox-muted">
                <span>{orderDraft.service_fee.toLocaleString()} ر.ي</span><span>رسوم الخدمة</span>
              </div>
              <div className="flex justify-between font-black text-white text-base pt-1 border-t border-vox-cyan/20">
                <span>{orderDraft.total.toLocaleString()} ر.ي</span><span>الإجمالي</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex border-t border-vox-cyan/20">
              <button onClick={cancelOrder}
                className="flex-1 py-3 text-sm text-vox-muted hover:text-red-400 transition-colors border-r border-vox-cyan/20">
                ✗ إلغاء
              </button>
              <button onClick={confirmOrder}
                className="flex-1 py-3 text-sm font-black text-white hover:bg-vox-cyan/10 transition-colors"
                style={{ color:"#06B6D4" }}>
                ✓ تأكيد الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Done / Tracking ──────────────────────────────────────────────── */}
      {phase === "done" && orderNumber && (
        <div className="w-full px-2">
          <div className="rounded-2xl p-4 border border-green-500/40 bg-green-500/5 text-center" dir="rtl">
            <p className="text-green-400 font-black text-base mb-1">✅ تم تأكيد الطلب!</p>
            <p className="text-vox-muted text-xs mb-3">رقم الطلب: {orderNumber}</p>
            <button onClick={() => router.push(`/orders/${orderId}`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600/30 border border-green-500/40 hover:bg-green-600/50 transition-colors">
              <Truck size={14} /> تتبع الطلب
            </button>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {phase === "error" && (
        <div className="w-full px-2 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={reset}
            className="text-vox-purple text-sm font-semibold hover:underline">
            حاول مجدداً
          </button>
        </div>
      )}

      {/* ── Tap hint when agent is ready ─────────────────────────────────── */}
      {phase === "agent" && (
        <div className="text-center">
          <p className="text-vox-muted text-xs">اضغط الزر وتحدث</p>
        </div>
      )}

      {/* ── Text input (idle + error) ─────────────────────────────────────── */}
      {(phase === "idle" || phase === "agent" || phase === "error") && (
        <div className="w-full px-2">
          <div className="flex gap-2">
            <button onClick={submitText} disabled={!textInput.trim()}
              className="bg-vox-purple hover:bg-vox-purple-dark disabled:opacity-40 rounded-xl px-4 py-3 text-white text-sm font-semibold transition-colors flex-shrink-0">
              إرسال
            </button>
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitText()}
              placeholder="مثال: أبغى برياني دجاج وبطاطس كبيرة..."
              className="flex-1 bg-vox-card border border-vox-border rounded-xl px-4 py-3 text-white text-sm placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors text-right min-w-0"
              dir="rtl"
            />
          </div>
        </div>
      )}

      {/* ── Reset button ─────────────────────────────────────────────────── */}
      {!["idle","error"].includes(phase) && (
        <button onClick={reset}
          className="flex items-center gap-1.5 text-vox-muted text-xs hover:text-white transition-colors py-1">
          <X size={12} /> بدء من جديد
        </button>
      )}
    </div>
  );
}
