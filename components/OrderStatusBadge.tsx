const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:          { label: "في الانتظار",    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  confirmed:        { label: "تم التأكيد",     color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  preparing:        { label: "قيد التحضير",    color: "text-vox-purple bg-vox-purple/10 border-vox-purple/30" },
  ready_for_pickup: { label: "جاهز للاستلام", color: "text-vox-cyan bg-vox-cyan/10 border-vox-cyan/30" },
  picked_up:        { label: "تم الاستلام",    color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  on_the_way:       { label: "في الطريق",      color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  delivered:        { label: "تم التوصيل",     color: "text-green-400 bg-green-400/10 border-green-400/30" },
  cancelled:        { label: "ملغي",           color: "text-red-400 bg-red-400/10 border-red-400/30" },
  rejected:         { label: "مرفوض",          color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "text-gray-400 bg-gray-400/10 border-gray-400/30" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
  );
}
