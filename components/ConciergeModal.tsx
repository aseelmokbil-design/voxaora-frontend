"use client";
import { useState } from "react";
import { X, Send, CheckCircle, Headphones } from "lucide-react";
import { intelligenceApi } from "@/lib/api";

interface Props {
  open: boolean;
  initialText?: string;
  onClose: () => void;
  onSpeak?: (text: string) => void;
}

export default function ConciergeModal({ open, initialText = "", onClose, onSpeak }: Props) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await intelligenceApi.concierge(text.trim(), undefined, false);
      setDone(res.message);
      if (onSpeak) onSpeak(res.tts_response);
    } catch {
      setDone("تم استلام طلبك. سيتواصل معك فريقنا قريباً.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
         style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-3xl p-6 border"
           style={{ background: "rgba(18,18,26,0.98)", borderColor: "rgba(139,92,246,0.3)" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose}><X size={20} className="text-vox-muted" /></button>
          <div className="flex items-center gap-2">
            <Headphones size={18} className="text-vox-cyan" />
            <h2 className="text-white font-black text-base">طلب مخصص</h2>
          </div>
        </div>

        {!done ? (
          <>
            <p className="text-vox-muted text-sm text-right mb-4 leading-relaxed">
              لم تجد ما تريد؟ أخبرنا وسيتواصل معك أحد موظفينا لإتمام الطلب يدوياً.
            </p>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="مثال: أريد باقة ورد حمراء للتوصيل اليوم، أو أريد طلب معين من مطعم غير موجود..."
              rows={4}
              dir="rtl"
              className="w-full bg-vox-card border border-vox-border rounded-2xl px-4 py-3 text-white text-sm placeholder-vox-muted focus:outline-none focus:border-vox-purple resize-none text-right"
            />

            <div className="flex gap-3 mt-4">
              <button onClick={submit} disabled={!text.trim() || loading}
                className="flex-1 flex items-center justify-center gap-2 bg-vox-purple disabled:opacity-40 rounded-2xl py-3 text-white text-sm font-bold transition-all">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Send size={14} /> إرسال الطلب</>
                )}
              </button>
              <button onClick={onClose}
                className="px-5 border border-vox-border text-vox-muted rounded-2xl text-sm hover:border-red-500/50 hover:text-red-400 transition-colors">
                إلغاء
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
            <p className="text-white font-bold text-base mb-2">تم استلام طلبك! ✅</p>
            <p className="text-vox-muted text-sm leading-relaxed">{done}</p>
            <button onClick={onClose}
              className="mt-5 bg-vox-purple text-white rounded-2xl px-8 py-3 text-sm font-bold">
              حسناً
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
