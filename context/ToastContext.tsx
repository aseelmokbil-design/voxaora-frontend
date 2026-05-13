"use client";
import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

const ICONS = {
  success: <CheckCircle size={16} className="text-green-400 flex-shrink-0" />,
  error:   <XCircle    size={16} className="text-red-400   flex-shrink-0" />,
  info:    <Info       size={16} className="text-vox-cyan  flex-shrink-0" />,
};

const BORDER = {
  success: "border-green-500/30",
  error:   "border-red-500/30",
  info:    "border-vox-cyan/30",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-safe top-4 left-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm mx-auto" suppressHydrationWarning>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold shadow-2xl pointer-events-auto fade-in
              bg-vox-card/95 backdrop-blur-xl ${BORDER[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="text-white flex-1 text-right">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-vox-muted hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
