"use client";
import { useState, useEffect, useCallback } from "react";
import { adminApi, AdminProductGlobal } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";
import { Search, RefreshCw, ChevronRight, ChevronLeft, Package } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  available:   { bg: "rgba(34,197,94,0.12)",  text: "#22C55E", label: "متاح" },
  unavailable: { bg: "rgba(107,114,128,0.1)", text: "#9CA3AF", label: "غير متاح" },
  out_of_stock:{ bg: "rgba(239,68,68,0.1)",   text: "#F87171", label: "نفذ" },
};

const PAGE_SIZE = 40;

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<AdminProductGlobal[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]         = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.productsGlobal({
      search: search   || undefined,
      status: statusFilter || undefined,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    })
      .then(r => { setProducts(r.products); setTotal(r.total); })
      .catch(() => toast("فشل تحميل المنتجات", "error"))
      .finally(() => setLoading(false));
  }, [search, statusFilter, page, toast]);

  useEffect(() => { setPage(0); }, [search, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-2xl">كتالوج المنتجات</h1>
          <p className="text-white/40 text-sm mt-0.5">{total.toLocaleString()} منتج إجمالاً</p>
        </div>
        <button onClick={load}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو اسم المتجر..."
            className="w-full rounded-xl pr-9 pl-4 py-2.5 text-white text-sm focus:outline-none placeholder-white/20"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none sm:w-40"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <option value="">كل الحالات</option>
          <option value="available">متاح</option>
          <option value="unavailable">غير متاح</option>
          <option value="out_of_stock">نفذ</option>
        </select>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={44} className="text-white/15 mb-3" />
          <p className="text-white/35 font-semibold">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => {
            const st = STATUS_STYLES[p.status] ?? { bg: "rgba(255,255,255,0.06)", text: "#fff", label: p.status };

            return (
              <div key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>

                {/* Image */}
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  {p.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    : "🍽️"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-white font-bold text-sm truncate">{p.name_ar || p.name}</p>
                  <p className="text-white/40 text-xs truncate">{p.merchant_name}</p>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <p className="text-vox-purple font-black text-sm">{p.price.toLocaleString()} ر.ي</p>
                  {p.discounted_price != null && (
                    <p className="text-white/25 text-[10px] line-through">{p.discounted_price.toLocaleString()}</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-black"
                  style={{ background: st.bg, color: st.text }}>
                  {st.label}
                </div>

                {/* Edit link → merchant product edit page */}
                <Link href={`/admin/merchants/${p.merchant_id}`}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "rgba(109,40,255,0.15)", color: "#A855F7", border: "1px solid rgba(109,40,255,0.25)" }}>
                  <ChevronLeft size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronRight size={15} className="text-white" />
          </button>
          <span className="text-white/50 text-sm">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ChevronLeft size={15} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
