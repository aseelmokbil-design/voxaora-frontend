"use client";
import { useState, useEffect } from "react";
import { driverApi, DriverWallet } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, CheckCircle } from "lucide-react";

const TX_STYLES: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  earning:    { icon: <ArrowDownRight size={14} />, color: "#22C55E",  bg: "rgba(34,197,94,0.12)" },
  bonus:      { icon: <CheckCircle size={14} />,    color: "#A855F7",  bg: "rgba(109,40,255,0.12)" },
  deduction:  { icon: <ArrowUpRight size={14} />,   color: "#EF4444",  bg: "rgba(239,68,68,0.1)" },
  withdrawal: { icon: <Wallet size={14} />,          color: "#F59E0B",  bg: "rgba(245,158,11,0.1)" },
};

export default function DriverWalletPage() {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<DriverWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = () => {
    setLoading(true);
    driverApi.wallet().then(setWallet).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleWithdraw = async () => {
    const num = parseFloat(amount);
    if (!num || num < 500) {
      toast("الحد الأدنى للسحب 500 ر.ي", "error");
      return;
    }
    setWithdrawing(true);
    try {
      const r = await driverApi.withdraw(num);
      toast(r.message, "success");
      setAmount("");
      setShowWithdraw(false);
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "فشل طلب السحب", "error");
    } finally { setWithdrawing(false); }
  };

  if (loading) {
    return (
      <div className="p-5 pt-10 space-y-4">
        <div className="skeleton h-32 rounded-3xl" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
      </div>
    );
  }

  if (!wallet) return null;

  return (
    <div className="px-4 pt-10 pb-6" dir="rtl">
      <div className="mb-5">
        <h1 className="text-white font-black text-2xl">المحفظة</h1>
      </div>

      {/* Balance card */}
      <div className="rounded-3xl p-6 mb-4"
        style={{ background: "linear-gradient(135deg,rgba(109,40,255,0.3),rgba(168,85,247,0.15))", border: "1px solid rgba(109,40,255,0.4)" }}>
        <p className="text-white/50 text-sm mb-1">الرصيد الكلي</p>
        <p className="text-white font-black text-4xl mb-4">{wallet.balance.toLocaleString()} <span className="text-xl text-white/50">ر.ي</span></p>

        <div className="flex gap-3">
          <div className="flex-1 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-white/40 text-[10px] mb-0.5">متاح للسحب</p>
            <p className="text-green-400 font-black text-lg">{wallet.available_for_withdrawal.toLocaleString()}</p>
          </div>
          {wallet.pending_withdrawal > 0 && (
            <div className="flex-1 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-white/40 text-[10px] mb-0.5">قيد الصرف</p>
              <p className="text-yellow-400 font-black text-lg">{wallet.pending_withdrawal.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw button */}
      {!showWithdraw ? (
        <button onClick={() => setShowWithdraw(true)}
          className="w-full py-3 rounded-2xl font-black text-base mb-4"
          style={{ background: "rgba(109,40,255,0.2)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.35)" }}>
          طلب سحب الأرباح
        </button>
      ) : (
        <div className="rounded-2xl p-4 mb-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-white/70 text-sm font-bold">مبلغ السحب (الحد الأدنى 500 ر.ي)</p>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl text-white text-lg font-black focus:outline-none text-right"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowWithdraw(false); setAmount(""); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
              إلغاء
            </button>
            <button onClick={handleWithdraw} disabled={withdrawing}
              className="flex-[2] py-2.5 rounded-xl text-sm font-black disabled:opacity-50"
              style={{ background: "rgba(109,40,255,0.8)", color: "#fff" }}>
              {withdrawing ? "جاري..." : "إرسال الطلب"}
            </button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <p className="text-white/50 text-sm font-bold mb-3">آخر المعاملات</p>
      {wallet.transactions.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2">
          <Wallet size={32} className="text-white/10" />
          <p className="text-white/30 text-sm">لا توجد معاملات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallet.transactions.map(tx => {
            const style = TX_STYLES[tx.type] ?? TX_STYLES.earning;
            const isPositive = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: style.bg, color: style.color }}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white/80 text-sm truncate">{tx.description}</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    {tx.status === "pending" && (
                      <Clock size={10} className="text-yellow-400" />
                    )}
                    <p className="text-white/30 text-[10px]">
                      {tx.status === "pending" ? "قيد المعالجة • " : ""}
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString("ar") : ""}
                    </p>
                  </div>
                </div>
                <p className={`font-black text-sm flex-shrink-0 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                  {isPositive ? "+" : ""}{tx.amount.toLocaleString()} ر.ي
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
