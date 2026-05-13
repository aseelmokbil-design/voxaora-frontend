"use client";
import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const dismissed = sessionStorage.getItem("vox_install_dismissed");
    if (dismissed) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIos(ios);

    if (ios) {
      // Show iOS instructions after a short delay
      setTimeout(() => setVisible(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem("vox_install_dismissed", "1");
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setVisible(false);
    setPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] fade-in">
      <div className="glass-card border border-vox-purple/30 rounded-3xl p-4 shadow-2xl glow-purple">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vox-purple to-vox-blue flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-white font-bold text-sm">ثبّت فوكسورا</p>
            {isIos ? (
              <p className="text-vox-muted text-xs mt-1 leading-relaxed">
                اضغط على <strong className="text-vox-cyan">مشاركة</strong> ثم <strong className="text-vox-cyan">إضافة إلى الشاشة الرئيسية</strong>
              </p>
            ) : (
              <p className="text-vox-muted text-xs mt-1 leading-relaxed">
                أضف التطبيق لشاشتك الرئيسية لتجربة أسرع وأفضل
              </p>
            )}
          </div>
          <button onClick={dismiss} className="text-vox-muted flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        {!isIos && prompt && (
          <button
            onClick={install}
            className="w-full mt-3 bg-gradient-to-r from-vox-purple to-vox-blue rounded-2xl py-2.5 text-white font-bold text-sm"
          >
            تثبيت الآن
          </button>
        )}
      </div>
    </div>
  );
}
