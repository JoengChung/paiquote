import { memo, useEffect } from "react";
import { formatCny, formatNum } from "@/lib/utils";
import type { Sku } from "@/lib/quote/types";
import { useQuote } from "@/lib/quote/store";

const STATUS: Record<Sku["status"], { label: string; cls: string }> = {
  pending: { label: "待识别", cls: "bg-amber-100 text-amber-900" },
  reading: { label: "识别中", cls: "bg-pine/15 text-pine" },
  review: { label: "待核对", cls: "bg-orange-100 text-orange-900" },
  ready: { label: "已确认", cls: "bg-pine text-cream" },
  error: { label: "需手工", cls: "bg-red-100 text-red-800" },
};

export const SkuCard = memo(function SkuCard({
  sku,
  index,
  onOpen,
}: {
  sku: Sku;
  index: number;
  onOpen: (sku: Sku) => void;
}) {
  const thumb = useQuote((s) => s.thumbs[sku.id]);
  const ensureThumb = useQuote((s) => s.ensureThumb);
  useEffect(() => {
    if (!thumb) void ensureThumb(sku.id);
  }, [thumb, sku.id, ensureThumb]);
  const st = STATUS[sku.status];
  return (
    <button
      type="button"
      onClick={() => onOpen(sku)}
      className="flex w-full gap-3 rounded-2xl border border-ink/8 bg-white/70 p-3 text-left shadow-sm transition hover:border-pine/30 hover:shadow-md"
    >
      <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-cream">
        {thumb ? (
          <img src={thumb} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-ink/40">无图</div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] text-cream">
          {index}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{sku.nameZh || "未填品名"}</p>
            <p className="truncate text-sm italic text-ink/55">{sku.nameEs || "Sin nombre"}</p>
            <p className="mt-0.5 truncate text-[11px] text-ink/40">
              {sku.factoryCode ? `${sku.factoryCode} · ` : ""}
              {sku.shopName || "未填店面"}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-x-2 text-xs text-ink/70">
          <div>
            <dt className="text-ink/40">单价</dt>
            <dd className="font-medium text-ink">{formatCny(sku.unitPriceCny)}</dd>
          </div>
          <div>
            <dt className="text-ink/40">装箱</dt>
            <dd className="font-medium text-ink">{sku.packingQty ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink/40">CBM</dt>
            <dd className="font-medium text-ink">{formatNum(sku.cbm, 3)}</dd>
          </div>
        </dl>
        {sku.error ? <p className="mt-1 truncate text-[11px] text-red-700">{sku.error}</p> : null}
      </div>
    </button>
  );
});
