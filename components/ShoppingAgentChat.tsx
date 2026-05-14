"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, Square, Send, X, ShoppingCart, CheckCircle, ChevronRight,
  Loader2, AlertCircle, Bot, User as UserIcon,
} from "lucide-react";
import {
  legacyAgentApi as agentApi, AgentResponse, AgentCartItem, AgentQuestion,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "agent";
  text: string;
  cartItems?: AgentCartItem[];
  questions?: AgentQuestion[];
  unavailableItems?: { name: string; alternatives: { id: string; name_ar: string; price: number }[] }[];
  total?: number;
  status?: AgentResponse["status"];
}

interface Props {
  merchantId: string;
  merchantName: string;
  lat?: number;
  lng?: number;
  onClose?: () => void;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "ar-SA"; utt.rate = 0.93; utt.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.startsWith("ar"));
  if (arVoice) utt.voice = arVoice;
  window.speechSynthesis.speak(utt);
}

export default function ShoppingAgentChat({
  merchantId, merchantName, lat = 15.3694, lng = 44.191, onClose,
}: Props) {
  const { user } = useAuth();
  const { addItem, updateQty, clear: clearCart, merchantId: cartMerchantId } = useCart();
  const router = useRouter();

  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const [recording,  setRecording]  = useState(false);
  const [recSecs,    setRecSecs]    = useState(0);

  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: "agent",
      text: `أهلاً! أنا مساعدك الذكي في ${merchantName}. قل أو اكتب طلبك كاملاً، مثل:\n"أريد برجر لحم حار، بطاطس كبيرة، وكولا لتر"`,
      status: "needs_clarification",
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addUserMsg = (text: string) => {
    setMessages(prev => [...prev, { role: "user", text }]);
  };

  const addAgentMsg = (res: AgentResponse) => {
    setMessages(prev => [...prev, {
      role:             "agent",
      text:             res.response_text,
      cartItems:        res.cart_items,
      questions:        res.questions,
      unavailableItems: res.unavailable_items,
      total:            res.total_amount,
      status:           res.status,
    }]);
    if (res.response_text) speak(res.response_text.split("\n")[0]);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;
    addUserMsg(text);
    setInput("");
    setLoading(true);
    try {
      const res = await agentApi.chat(text, merchantId, sessionId, lat, lng);
      setSessionId(res.session_id);
      addAgentMsg(res);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "agent",
        text: e instanceof Error ? e.message : "حدث خطأ. حاول مجدداً.",
        status: "error",
      }]);
    } finally {
      setLoading(false);
    }
  }, [user, merchantId, sessionId, lat, lng]);

  const handleQuickAnswer = (answer: string) => sendMessage(answer);

  // Add cart items to global cart and go to checkout
  const confirmCart = useCallback((cartItems: AgentCartItem[]) => {
    if (cartMerchantId && cartMerchantId !== merchantId) clearCart();
    cartItems.forEach(item => {
      const product = {
        id: item.product_id,
        name: item.product_name,
        name_ar: item.product_name,
        price: item.unit_price,
        preparation_time: 15,
        image_url: item.image_url,
      };
      addItem(product, merchantId, merchantName);
      if (item.quantity > 1) {
        updateQty(item.product_id, item.quantity);
      }
    });
    router.push("/cart");
  }, [cartMerchantId, merchantId, merchantName, clearCart, addItem, updateQty, router]);

  // Voice recording
  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4", ""]
        .find(m => !m || MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        stream.getTracks().forEach(t => t.stop());
        setRecording(false); setRecSecs(0);
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        if (blob.size < 800) return;

        // Transcribe via existing voice endpoint then send to agent
        setLoading(true);
        try {
          const { voiceApi } = await import("@/lib/api");
          const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
          const form = new FormData();
          form.append("audio", blob, `voice.${ext}`);
          form.append("latitude", String(lat));
          form.append("longitude", String(lng));
          const token = localStorage.getItem("vox_token");
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
          const transcribeRes = await fetch(`${API}/api/v1/voice/transcribe`, {
            method: "POST", headers, body: form,
          });
          if (transcribeRes.ok) {
            const data = await transcribeRes.json();
            const transcript = data.transcript || "";
            if (transcript.trim().length >= 2) {
              await sendMessage(transcript);
            } else {
              setMessages(prev => [...prev, {
                role: "agent", text: "ما سمعتك زين. تحدث بوضوح وحاول مجدداً.", status: "error",
              }]);
            }
          }
        } catch {
          setMessages(prev => [...prev, {
            role: "agent", text: "فشل تحليل الصوت. حاول مجدداً.", status: "error",
          }]);
        } finally {
          setLoading(false);
        }
      };

      mediaRef.current = recorder;
      recorder.start(250);
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => {
        setRecSecs(s => {
          if (s >= 29) { mediaRef.current?.stop(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setMessages(prev => [...prev, {
        role: "agent", text: "لا يمكن الوصول للميكروفون.", status: "error",
      }]);
    }
  }, [user, lat, lng, sendMessage]);

  const stopRecording = () => mediaRef.current?.stop();

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(8,8,16,0.98)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 flex-shrink-0 border-b border-white/5">
        <button onClick={onClose}>
          <ChevronRight size={22} className="text-white/50" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <Bot size={16} className="text-vox-purple" />
            <p className="text-white font-black text-sm">المساعد الذكي</p>
          </div>
          <p className="text-vox-muted text-xs">{merchantName}</p>
        </div>
        <div className="w-6" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i}>
            {/* Bubble */}
            <div className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"} gap-2`}>
              {msg.role === "agent" && (
                <div className="w-7 h-7 rounded-full bg-vox-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={13} className="text-vox-purple" />
                </div>
              )}
              <div
                className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={msg.role === "agent"
                  ? { background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.2)", color: "#e2d9f3" }
                  : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }
                }
                dir="rtl"
              >
                {msg.text}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserIcon size={13} className="text-white/60" />
                </div>
              )}
            </div>

            {/* Clarification quick-answer buttons */}
            {msg.role === "agent" && msg.questions && msg.questions.length > 0 && (
              <div className="mt-2 mr-9 flex flex-wrap gap-1.5 justify-end">
                {msg.questions[0].options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => handleQuickAnswer(opt)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "rgba(109,40,255,0.2)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.4)" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Cart preview */}
            {msg.role === "agent" && msg.cartItems && msg.cartItems.length > 0 && (
              <div className="mt-2 mr-9 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(109,40,255,0.3)" }}>
                {msg.cartItems.map((item, ci) => (
                  <div key={ci} className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5 last:border-0" dir="rtl">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">×{item.quantity}</span>
                      <span className="text-white text-sm font-semibold">{item.product_name}</span>
                      {Object.keys(item.selected_options || {}).length > 0 && (
                        <span className="text-vox-muted text-xs">
                          ({Object.values(item.selected_options).join("، ")})
                        </span>
                      )}
                    </div>
                    <span className="text-vox-purple text-sm font-bold">{item.subtotal.toFixed(0)} ر.س</span>
                  </div>
                ))}
                {msg.total !== undefined && msg.total > 0 && (
                  <div className="flex items-center justify-between px-3.5 py-2 bg-vox-purple/10" dir="rtl">
                    <span className="text-white font-black text-sm">الإجمالي</span>
                    <span className="text-vox-purple font-black text-base">{msg.total.toFixed(0)} ر.س</span>
                  </div>
                )}
              </div>
            )}

            {/* Unavailable items */}
            {msg.role === "agent" && msg.unavailableItems && msg.unavailableItems.length > 0 && (
              <div className="mt-2 mr-9 space-y-1.5">
                {msg.unavailableItems.filter(u => u.alternatives?.length > 0).map((u, ui) => (
                  <div key={ui} className="rounded-xl px-3 py-2 text-xs" dir="rtl"
                    style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
                    <p className="text-yellow-400 font-semibold mb-1">⚠️ {u.name} غير متوفر. البدائل:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {u.alternatives.map((alt, ai) => (
                        <button key={ai}
                          onClick={() => handleQuickAnswer(`أريد ${alt.name_ar} بدلاً منه`)}
                          className="px-2.5 py-1 rounded-lg font-semibold transition-all active:scale-95"
                          style={{ background: "rgba(234,179,8,0.15)", color: "#fbbf24" }}>
                          {alt.name_ar} — {alt.price.toFixed(0)} ر.س
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm button */}
            {msg.role === "agent" && msg.status === "needs_confirmation" && msg.cartItems && msg.cartItems.length > 0 && (
              <div className="mt-3 mr-9">
                <button
                  onClick={() => confirmCart(msg.cartItems!)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-white text-sm transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg,#6D28FF,#A855F7)", boxShadow: "0 0 20px rgba(109,40,255,0.4)" }}
                >
                  <CheckCircle size={16} />
                  تأكيد وإضافة للسلة
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-end gap-2">
            <div className="w-7 h-7 rounded-full bg-vox-purple/20 flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-vox-purple" />
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(109,40,255,0.12)", border: "1px solid rgba(109,40,255,0.2)" }}>
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-vox-purple animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-8 pt-3 border-t border-white/5">
        {recording ? (
          <div className="flex items-center gap-3">
            <button
              onClick={stopRecording}
              className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center flex-shrink-0 active:scale-95"
            >
              <Square size={18} className="fill-white text-white" />
            </button>
            <div className="flex-1 rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-semibold">جارٍ التسجيل... {recSecs}ث</span>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
              style={{ background: "rgba(109,40,255,0.2)", border: "1px solid rgba(109,40,255,0.4)" }}
            >
              <Mic size={18} className="text-vox-purple" />
            </button>
            <div className="flex-1 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="مثال: برجر لحم حار مع بطاطس كبيرة وكولا لتر..."
                dir="rtl"
                disabled={loading}
                className="flex-1 rounded-2xl px-4 py-3 text-sm text-white placeholder-vox-muted focus:outline-none transition-colors disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#6D28FF,#A855F7)" }}
              >
                {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
              </button>
            </div>
          </div>
        )}
        <p className="text-vox-muted text-xs text-center mt-2">
          يمكنك طلب عدة منتجات دفعة واحدة بلغة طبيعية
        </p>
      </div>
    </div>
  );
}
