"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, X, CheckCircle, RotateCcw, ShoppingCart, Zap } from "lucide-react";
import { voiceApi, VoiceRecommendation, VoiceResponse, VoiceContext, intelligenceApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import ConciergeModal from "./ConciergeModal";

type Phase =
  | "idle" | "greeting" | "listening" | "followup_listening" | "processing"
  | "results" | "unavailable" | "confirming" | "done" | "error";

const IDENTITY_MESSAGES = [
  { line1: "اخترت لك أفضل قيمة في المنطقة", line2: "قرار ذكي في أقل من دقيقة." },
  { line1: "وفّرت عليك البحث والمقارنة",     line2: "وقتك أغلى من أن تضيعه." },
  { line1: "فوكسورا اختار الأفضل لك",          line2: "أنت فقط تحدثت، نحن أنجزنا." },
  { line1: "طلبت بذكاء، ستصل بسرعة",          line2: "هذا ما يعنيه التطبيق الذكي." },
  { line1: "قارنّا لك، اخترنا الأسرع والأجود", line2: "لا بحث، لا حيرة، فقط النتيجة." },
];

interface Props { lat?: number; lng?: number; }

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Haptic feedback (Android / supported browsers) ────────────────────────────
const haptic = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
};

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text: string, lang = "ar-SA"): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang; utt.rate = 0.92; utt.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith("ar") && (v.name.includes("Google") || v.name.includes("Arabic")))
                 ?? voices.find(v => v.lang.startsWith("ar"));
    if (arVoice && lang.startsWith("ar")) utt.voice = arVoice;
    utt.onend = () => resolve(); utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

export default function VoiceOrb({ lat = 15.3694, lng = 44.1910 }: Props) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const router   = useRouter();

  const [phase,            setPhase]            = useState<Phase>("idle");
  const [transcript,       setTranscript]        = useState("");
  const [results,          setResults]           = useState<VoiceRecommendation[]>([]);
  const [sessionId,        setSessionId]         = useState("");
  const [ttsText,          setTtsText]           = useState("");
  const [error,            setError]             = useState("");
  const [textInput,        setTextInput]         = useState("");
  const [audioLevel,       setAudioLevel]        = useState(0);
  const [recordingSeconds, setRecordingSeconds]  = useState(0);
  const [showConcierge,    setShowConcierge]     = useState(false);
  const [lastTranscript,   setLastTranscript]    = useState("");
  const [identityMsg,      setIdentityMsg]       = useState<typeof IDENTITY_MESSAGES[0] | null>(null);
  const [cartAdded,        setCartAdded]         = useState<number | null>(null);

  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef     = useRef<number>(0);

  useEffect(() => { if ("speechSynthesis" in window) window.speechSynthesis.getVoices(); }, []);

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const reset = useCallback(() => {
    window.speechSynthesis?.cancel();
    mediaRef.current?.stop();
    cancelAnimationFrame(animRef.current);
    stopTimer();
    setPhase("idle"); setTranscript(""); setResults([]); setSessionId("");
    setTtsText(""); setError(""); setTextInput(""); setAudioLevel(0); setRecordingSeconds(0);
    setIdentityMsg(null); setCartAdded(null);
  }, []);

  // ── Add voice recommendation to cart ──────────────────────────────────
  const addRecommendationToCart = useCallback((rec: VoiceRecommendation, index: number) => {
    if (!rec.items || rec.items.length === 0) return;
    const merchantName = rec.name_ar || rec.name;
    rec.items.slice(0, 3).forEach(item => {
      addItem(
        {
          id: item.id,
          name: item.name,
          name_ar: item.name_ar,
          price: item.price,
          preparation_time: item.preparation_time,
          image_url: undefined,
        },
        rec.id,
        merchantName,
      );
    });
    setCartAdded(index);
    haptic([30, 50, 100]);
    speak(`تمت إضافة منتجات ${merchantName} للسلة`, "ar-SA");
  }, [addItem]);

  // ── Process API response ──────────────────────────────────────────────────
  const processVoiceResponse = useCallback(async (data: VoiceResponse) => {
    setTranscript(data.transcript);
    setLastTranscript(data.transcript);
    const lang = data.intent?.language === "en" ? "en-US" : "ar-SA";

    // Reorder action: order was already placed on the backend
    if (data.intent?.action === "reorder" && data.intent?.order_id) {
      setPhase("done");
      setIdentityMsg(IDENTITY_MESSAGES[Math.floor(Math.random() * IDENTITY_MESSAGES.length)]);
      setTtsText(data.tts_response);
      await speak(data.tts_response, lang);
      setTimeout(() => router.push(`/orders/${data.intent!.order_id}`), 2500);
      return;
    }

    if (data.recommendations.length === 0) {
      const msg = data.tts_response || "عذراً، لم نجد نتائج. هل تريد تجربة طلب آخر؟";
      setTtsText(msg); setPhase("unavailable");
      await speak(msg, lang);
    } else {
      setResults(data.recommendations.slice(0, 3));
      setSessionId(data.session_id);
      setTtsText(data.tts_response);
      setPhase("results");
      await speak(data.tts_response, lang);
    }
  }, [router]);

  const handleApiError = useCallback(async (e: unknown) => {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) {
      await speak("انتهت جلستك، سيتم توجيهك لتسجيل الدخول.", "ar-SA");
      localStorage.removeItem("vox_token"); localStorage.removeItem("vox_user");
      router.push("/auth/login"); return;
    }
    const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
    haptic([200, 100, 200]); // error pattern
    setError(msg); setPhase("error");
    await speak("عذراً، حدث خطأ. اضغط للمحاولة مجدداً.", "ar-SA");
  }, [router]);

  // ── Confirm order (defined early — used by startFollowup) ────────────────
  const confirmOrder = useCallback(async (index: number) => {
    const selected = results[index]; if (!selected) return;
    setPhase("confirming");
    await speak(`جارٍ تأكيد طلبك من ${selected.name_ar || selected.name}...`, "ar-SA");
    try {
      const res = await voiceApi.confirm(sessionId, index);
      haptic([10, 80, 150]); // success pattern
      setPhase("done");
      setIdentityMsg(IDENTITY_MESSAGES[Math.floor(Math.random() * IDENTITY_MESSAGES.length)]);
      const msg = res.tts_response || `ابشر! تم تأكيد طلبك. سيصل خلال ${res.estimated_eta} دقيقة.`;
      setTtsText(msg);
      await speak(msg, "ar-SA");
      setTimeout(() => router.push(`/orders/${res.order_id}`), 2800);
    } catch (e) { await handleApiError(e); }
  }, [sessionId, results, router, handleApiError]);

  // ── Start recording session ───────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (!user) { router.push("/auth/login"); return; }
    setPhase("greeting"); setError("");

    try {
      const res = await fetch(`${API}/api/v1/voice/greeting?language=ar`);
      const { greeting } = await res.json();
      setTtsText(greeting);
      await speak(greeting, "ar-SA");
    } catch { await speak("أهلاً! ماذا تريد اليوم؟", "ar-SA"); }

    setPhase("listening"); setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio level analyser
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const trackLevel = () => {
        if (!analyserRef.current) return;
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        setAudioLevel(buf.reduce((s, v) => s + v, 0) / buf.length);
        animRef.current = requestAnimationFrame(trackLevel);
      };
      animRef.current = requestAnimationFrame(trackLevel);

      // 30-second timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => { if (s >= 29) { mediaRef.current?.stop(); return s; } return s + 1; });
      }, 1000);

      // Pick best MIME type
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4", ""]
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
        await speak("ممتاز! أبحث لك الآن عن أفضل الخيارات...", "ar-SA");

        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });

        if (blob.size < 1000) {
          setError("التسجيل قصير جداً. تحدث لمدة أطول ثم اضغط إيقاف.");
          setPhase("error"); return;
        }

        try {
          const data = await voiceApi.transcribe(blob, lat, lng);
          await processVoiceResponse(data);
        } catch (e: unknown) {
          const status = (e as {status?: number}).status;
          const msg    = e instanceof Error ? e.message : "";
          if (status === 422 || msg.includes("فهم الكلام") || msg.includes("واضح")) {
            // Not understood — ask to repeat, don't show error state
            setPhase("idle");
            await speak("ما سمعتك زين. تحدث بوضوح وقرب من الميكروفون، وحاول مجدداً.", "ar-SA");
          } else {
            await handleApiError(e);
          }
        }
      };

      mediaRef.current = recorder;
      recorder.start(250);  // collect data every 250ms

    } catch {
      setError("لا يمكن الوصول للميكروفون. تحقق من إذن المتصفح.");
      setPhase("error");
      await speak("لم أتمكن من الوصول للميكروفون.", "ar-SA");
    }
  }, [user, lat, lng, router, processVoiceResponse, handleApiError]);

  const stopRecording = useCallback(() => { mediaRef.current?.stop(); }, []);

  // ── Follow-up recording (multi-turn) ──────────────────────────────────────
  const startFollowup = useCallback(async () => {
    if (!user || results.length === 0) return;

    const context: VoiceContext = {
      previous_transcript: transcript,
      previous_session_id: sessionId,
      previous_results: results.map(r => ({
        name: r.name, name_ar: r.name_ar,
        estimated_eta_minutes: r.estimated_eta_minutes,
        delivery_fee: r.delivery_fee,
        distance_km: r.distance_km,
        rating: r.rating,
      })),
    };

    setPhase("followup_listening"); setRecordingSeconds(0);
    await speak("تفضل، قل اختيارك.", "ar-SA");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const trackLevel = () => {
        if (!analyserRef.current) return;
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        setAudioLevel(buf.reduce((s, v) => s + v, 0) / buf.length);
        animRef.current = requestAnimationFrame(trackLevel);
      };
      animRef.current = requestAnimationFrame(trackLevel);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => { if (s >= 14) { mediaRef.current?.stop(); return s; } return s + 1; });
      }, 1000);

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4", ""]
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
          setPhase("results");
          await speak("ما سمعتك. قل اختيارك مجدداً.", "ar-SA");
          return;
        }

        try {
          const data = await voiceApi.transcribe(blob, lat, lng, context);

          // Check if backend resolved a direct selection
          if (data.intent?.action === "select") {
            const idx = typeof data.intent.selected_index === "number" ? data.intent.selected_index : 0;
            await speak(data.tts_response, "ar-SA");
            await confirmOrder(idx);
          } else {
            await processVoiceResponse(data);
          }
        } catch (e) {
          const status = (e as {status?: number}).status;
          if (status === 422) {
            setPhase("results");
            await speak("ما سمعتك زين. قل اختيارك مجدداً.", "ar-SA");
          } else {
            await handleApiError(e);
          }
        }
      };

      mediaRef.current = recorder;
      recorder.start(250);
    } catch {
      setPhase("results");
      await speak("لم أتمكن من الوصول للميكروفون.", "ar-SA");
    }
  }, [user, results, transcript, sessionId, lat, lng, processVoiceResponse, handleApiError, confirmOrder]);

  const stopFollowup = useCallback(() => { mediaRef.current?.stop(); }, []);

  // ── Text submit ───────────────────────────────────────────────────────────
  const submitText = useCallback(async () => {
    if (!textInput.trim() || !user) return;
    setPhase("processing");
    await speak("ممتاز! أبحث لك الآن عن أفضل الخيارات...", "ar-SA");
    try {
      const data = await voiceApi.processText(textInput, lat, lng);
      await processVoiceResponse(data);
    } catch (e) { await handleApiError(e); }
  }, [textInput, user, lat, lng, processVoiceResponse, handleApiError]);

  // ── Orb visual ────────────────────────────────────────────────────────────
  const ringScale  = 1 + (audioLevel / 255) * 1.8;
  const orbColors: Record<Phase, string> = {
    idle:              "bg-gradient-to-br from-vox-purple to-vox-blue",
    greeting:          "bg-gradient-to-br from-vox-cyan to-vox-blue",
    listening:         "bg-red-600",
    followup_listening:"bg-orange-600",
    processing:        "bg-vox-card border-2 border-vox-purple",
    results:           "bg-vox-card border-2 border-vox-purple/60",
    unavailable:       "bg-vox-card border-2 border-orange-400/60",
    confirming:        "bg-gradient-to-br from-vox-cyan to-vox-blue",
    done:              "bg-green-600",
    error:             "bg-red-900 border border-red-500",
  };

  return (
    <div className="flex flex-col items-center w-full">

      {/* ── Orb ───────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center mb-5">
        {phase === "idle" && (
          <><div className="absolute w-36 h-36 rounded-full bg-vox-purple/10 orb-ring" />
            <div className="absolute w-36 h-36 rounded-full bg-vox-purple/10 orb-ring orb-ring-2" /></>
        )}
        {(phase === "listening" || phase === "followup_listening") && (
          <><div className={`absolute w-36 h-36 rounded-full ${phase === "followup_listening" ? "bg-orange-500/20" : "bg-red-500/20"} transition-transform duration-75`}
                 style={{ transform: `scale(${ringScale})` }} />
            <div className={`absolute w-36 h-36 rounded-full ${phase === "followup_listening" ? "bg-orange-500/10" : "bg-red-500/10"} orb-ring`} /></>
        )}
        {["greeting","confirming"].includes(phase) && (
          <><div className="absolute w-36 h-36 rounded-full bg-vox-cyan/20 orb-ring" style={{ animationDuration:"1.5s" }} />
            <div className="absolute w-36 h-36 rounded-full bg-vox-cyan/10 orb-ring orb-ring-2" style={{ animationDuration:"1.5s" }} /></>
        )}

        <button
          onClick={
            phase === "idle"               ? startSession  :
            phase === "listening"          ? stopRecording :
            phase === "followup_listening" ? stopFollowup  :
            phase === "error"              ? reset : undefined
          }
          disabled={["greeting","processing","confirming","done","results","unavailable"].includes(phase)}
          className={clsx(
            "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 text-white relative z-10 select-none",
            orbColors[phase],
            phase === "idle"      && "glow-purple hover:scale-105 active:scale-95 cursor-pointer",
            phase === "listening" && "recording-glow cursor-pointer",
            phase === "done"      && "glow-cyan",
            phase === "error"     && "cursor-pointer hover:opacity-80",
          )}>
          {phase === "idle" && <Mic size={48} />}
          {phase === "greeting" && (
            <div className="flex gap-1 items-end h-8">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-1 bg-white rounded-full animate-bounce"
                     style={{ height:`${40+Math.sin(i)*20}%`, animationDelay:`${i*0.1}s` }} />
              ))}
            </div>
          )}
          {(phase === "listening" || phase === "followup_listening") && (
            <div className="flex flex-col items-center gap-1">
              <Square size={28} className="fill-white" />
              <span className="text-xs font-bold">{recordingSeconds}ث</span>
            </div>
          )}
          {phase === "processing"  && <div className="w-10 h-10 border-2 border-vox-purple border-t-transparent rounded-full animate-spin" />}
          {phase === "results"     && <Mic size={36} className="text-vox-purple" />}
          {phase === "unavailable" && <span className="text-2xl">🔍</span>}
          {phase === "confirming"  && <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {phase === "done"        && <CheckCircle size={48} />}
          {phase === "error"       && <RotateCcw size={36} className="text-red-400" />}
        </button>
      </div>

      {/* ── Status ────────────────────────────────────────────────────────── */}
      <div className="text-center mb-4 min-h-[72px] px-4 w-full">
        {phase === "idle" && (
          <div>
            <p className="text-white font-semibold text-base mb-0.5">اضغط وتحدث</p>
            <p className="text-vox-muted text-xs">أو اكتب طلبك بالأسفل</p>
          </div>
        )}
        {phase === "greeting" && <p className="text-vox-cyan font-semibold animate-pulse text-sm">{ttsText}</p>}
        {phase === "listening" && (
          <div>
            <p className="text-red-400 font-bold animate-pulse mb-1 text-sm">🎙️ أنا أسمعك... تحدث بحرية</p>
            <p className="text-vox-muted text-xs mb-2">اضغط الزر للإيقاف • {30 - recordingSeconds}ث متبقية</p>
            <div className="flex gap-0.5 justify-center items-end h-6 mt-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 rounded-full bg-red-400 transition-all duration-75"
                     style={{ height: `${Math.max(15, (audioLevel/255)*100*(0.3+Math.abs(Math.sin(i*0.7+Date.now()/200))*0.7))}%` }} />
              ))}
            </div>
          </div>
        )}
        {phase === "followup_listening" && (
          <div>
            <p className="text-orange-400 font-bold animate-pulse mb-1 text-sm">🎙️ قل اختيارك...</p>
            <p className="text-vox-muted text-xs mb-2">مثال: الأول، الثاني، الأقرب، الأرخص</p>
            <div className="flex gap-0.5 justify-center items-end h-6 mt-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="w-1 rounded-full bg-orange-400 transition-all duration-75"
                     style={{ height: `${Math.max(15, (audioLevel/255)*100*(0.3+Math.abs(Math.sin(i*0.7+Date.now()/200))*0.7))}%` }} />
              ))}
            </div>
          </div>
        )}
        {phase === "processing"  && <p className="text-vox-purple animate-pulse text-sm font-semibold">جارٍ تحليل طلبك والبحث...</p>}
        {phase === "confirming"  && <p className="text-vox-cyan animate-pulse text-sm font-semibold">جارٍ تأكيد طلبك...</p>}
        {phase === "done" && (
          <div className="text-center">
            <p className="text-green-400 font-bold text-base mb-1">✅ تم تأكيد طلبك!</p>
            {identityMsg ? (
              <div className="mt-2 space-y-0.5">
                <p className="text-white text-sm font-bold">{identityMsg.line1}</p>
                <p className="text-vox-muted text-xs">{identityMsg.line2}</p>
              </div>
            ) : (
              <p className="text-vox-muted text-xs">جارٍ الانتقال لتتبع الطلب...</p>
            )}
          </div>
        )}
        {phase === "error" && (
          <div>
            <p className="text-red-400 text-sm mb-2 font-medium">{error}</p>
            <button onClick={reset} className="text-vox-purple text-sm font-semibold hover:underline">حاول مجدداً</button>
          </div>
        )}
        {phase === "results" && transcript && (
          <div dir="rtl">
            <p className="text-gray-500 text-xs mb-0.5">فهمت طلبك:</p>
            <p className="text-white text-sm font-semibold">"{transcript}"</p>
          </div>
        )}
        {phase === "unavailable" && <p className="text-orange-400 text-sm font-semibold">{ttsText}</p>}
      </div>

      {/* ── TTS bubble ────────────────────────────────────────────────────── */}
      {phase === "results" && ttsText && (
        <div className="w-full px-2 mb-4">
          <div className="rounded-2xl p-3.5 border border-vox-cyan/25" style={{ background:"rgba(6,182,212,0.06)" }}>
            <div className="flex gap-2" dir="rtl">
              <span className="text-vox-cyan text-lg flex-shrink-0">🤖</span>
              <p className="text-vox-cyan text-sm leading-relaxed">{ttsText}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recommendation cards ──────────────────────────────────────────── */}
      {phase === "results" && results.length > 0 && (
        <div className="w-full px-2 slide-up space-y-2 mb-4">
          {results.map((r, i) => (
            <div key={r.id}
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "rgba(18,18,26,0.95)",
                borderColor: cartAdded === i ? "rgba(16,185,129,0.6)" : i===0 ? "rgba(139,92,246,0.5)" : "rgba(30,30,46,0.8)",
                boxShadow: cartAdded === i ? "0 0 12px rgba(16,185,129,0.2)" : i===0 ? "0 0 12px rgba(139,92,246,0.15)" : "none",
              }}>
              {/* Header */}
              <div className="p-3.5 pb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={clsx("text-[11px] font-bold px-2.5 py-0.5 rounded-full",
                    cartAdded === i ? "bg-emerald-500/20 text-emerald-400" :
                    i===0 ? "bg-vox-purple/20 text-vox-purple" :
                    i===1 ? "bg-vox-blue/20 text-vox-blue" : "bg-vox-border text-vox-muted")}>
                    {cartAdded === i ? "✓ في السلة" : i===0 ? "⭐ الأفضل" : i===1 ? "# الثاني" : "# الثالث"}
                  </span>
                  <span className="text-white font-black text-sm">{r.name_ar || r.name}</span>
                </div>
                <div className="flex items-center justify-end gap-3 text-xs text-vox-muted">
                  <span className="text-yellow-400 font-semibold">⭐ {r.rating?.toFixed(1)}</span>
                  <span>🕐 {r.estimated_eta_minutes}د</span>
                  <span>📍 {r.distance_km?.toFixed(1)}كم</span>
                  <span className={r.delivery_fee===0 ? "text-green-400 font-semibold" : ""}>
                    {r.delivery_fee===0 ? "🎁 مجاني" : `توصيل ${r.delivery_fee} ريال`}
                  </span>
                </div>
              </div>

              {/* Matched products */}
              {r.items && r.items.length > 0 && (
                <div className="px-3.5 pb-2 flex flex-wrap gap-1.5 justify-end">
                  {r.items.slice(0,3).map((item,pi) => (
                    <span key={pi} className={clsx("text-[11px] px-2.5 py-0.5 rounded-full border",
                      r.has_requested_items ? "border-vox-cyan/40 text-vox-cyan bg-vox-cyan/10" : "border-vox-border text-vox-muted")}>
                      {item.name_ar || item.name} · {item.price.toLocaleString()} ر.ي
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex border-t border-white/5">
                <button
                  onClick={() => addRecommendationToCart(r, i)}
                  disabled={cartAdded === i || !r.items?.length}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-r border-white/5",
                    cartAdded === i
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-vox-cyan hover:bg-vox-cyan/10",
                  )}>
                  <ShoppingCart size={12} />
                  {cartAdded === i ? "أُضيف للسلة" : "أضف للسلة"}
                </button>
                <button
                  onClick={() => confirmOrder(i)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white hover:bg-vox-purple/20 transition-all">
                  <Zap size={12} className="text-vox-purple" />
                  اطلب مباشرة
                </button>
              </div>
            </div>
          ))}

          {/* Cart quick-link if items added */}
          {cartAdded !== null && (
            <button
              onClick={() => router.push("/cart")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-black"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)", boxShadow: "0 0 16px rgba(16,185,129,0.4)" }}>
              <ShoppingCart size={14} />
              عرض السلة وتأكيد الطلب
            </button>
          )}

          {/* Multi-turn: voice follow-up */}
          <div className="flex gap-2">
            <button onClick={startFollowup}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600/15 border border-orange-500/30 text-orange-400 rounded-2xl py-2.5 text-sm font-semibold hover:bg-orange-600/25 transition-colors">
              <Mic size={14} /> قل اختيارك
            </button>
            <button onClick={reset}
              className="flex items-center justify-center gap-2 text-vox-muted text-sm px-4 py-2.5 hover:text-white transition-colors">
              <X size={14} /> إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ── Unavailable ───────────────────────────────────────────────────── */}
      {phase === "unavailable" && (
        <div className="w-full px-2 slide-up mb-4">
          <div className="rounded-2xl p-4 border border-orange-400/20 bg-orange-400/5 text-center">
            <p className="text-orange-300 text-sm mb-3">لم نجد ما تبحث عنه.</p>
            <div className="flex gap-2 mb-2">
              <button onClick={reset} className="flex-1 border border-vox-border text-vox-muted rounded-xl py-2.5 text-sm hover:border-red-500/50 hover:text-red-400 transition-colors">إلغاء</button>
              <button onClick={() => { reset(); setTimeout(startSession, 150); }}
                className="flex-1 bg-vox-purple rounded-xl py-2.5 text-white text-sm font-semibold">اطلب آخر</button>
            </div>
            {/* Concierge fallback */}
            <button onClick={() => setShowConcierge(true)}
              className="w-full flex items-center justify-center gap-2 border border-vox-cyan/30 text-vox-cyan rounded-xl py-2.5 text-sm hover:bg-vox-cyan/10 transition-colors">
              🎧 طلب مخصص — فريقنا يساعدك
            </button>
          </div>
        </div>
      )}

      {/* ── Text input ────────────────────────────────────────────────────── */}
      {(phase === "idle" || phase === "error") && (
        <div className="w-full px-2">
          <div className="flex gap-2">
            <button onClick={submitText} disabled={!textInput.trim()}
              className="bg-vox-purple hover:bg-vox-purple-dark disabled:opacity-40 rounded-xl px-4 py-3 text-white text-sm font-semibold transition-colors flex-shrink-0">
              إرسال
            </button>
            <input value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitText()}
              placeholder="مثال: ابغى زنجر، لاتيه، فيتامين سي..."
              className="flex-1 bg-vox-card border border-vox-border rounded-xl px-4 py-3 text-white text-sm placeholder-vox-muted focus:outline-none focus:border-vox-purple transition-colors text-right min-w-0"
              dir="rtl" />
          </div>
        </div>
      )}

      {/* ── Concierge Modal ───────────────────────────────────────────────── */}
      <ConciergeModal
        open={showConcierge}
        initialText={lastTranscript}
        onClose={() => setShowConcierge(false)}
        onSpeak={text => speak(text, "ar-SA")}
      />
    </div>
  );
}
