import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";
import { ArrowLeft, Sparkles, Download, Save } from "lucide-react";
import { PhotoPicker } from "@/components/photo-picker";
import { SkuCard } from "@/components/sku-card";
import { SkuEditor } from "@/components/sku-editor";
import { CBM_20GP, CBM_40HQ, type Sku } from "@/lib/quote/types";
import { sheetStats, useQuote } from "@/lib/quote/store";
import { formatNum } from "@/lib/utils";

export const Route = createFileRoute("/sheet/$id")({ component: SheetPage });

function SheetPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const ready = useQuote((s) => s.ready);
  const hasSheet = useQuote((s) => s.sheets.some((x) => x.id === id));
  const skus = useQuote(useShallow((s) => s.skus.filter((x) => x.sheetId === id)));
  const jobCount = useQuote((s) => s.jobCount);
  const savedAt = useQuote((s) => s.savedAt);
  const hydrate = useQuote((s) => s.hydrate);
  const addPhotos = useQuote((s) => s.addPhotos);
  const recognizePending = useQuote((s) => s.recognizePending);
  const exportSheetExcel = useQuote((s) => s.exportSheetExcel);
  const updateSku = useQuote((s) => s.updateSku);
  const deleteSku = useQuote((s) => s.deleteSku);
  const recognizeSku = useQuote((s) => s.recognizeSku);
  const thumbs = useQuote((s) => s.thumbs);
  const markSaved = useQuote((s) => s.markSaved);
  const [editing, setEditing] = useState<Sku | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const stats = useMemo(() => sheetStats(skus), [skus]);

  if (!hasSheet) {
    if (!ready) {
      return <main className="min-h-screen bg-cream px-5 pt-10 text-sm text-ink/50">打开报价单…</main>;
    }
    return (
      <main className="min-h-screen bg-cream px-5 pt-10">
        <p>找不到这张单。</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => void navigate({ to: "/" })}>
          返回
        </button>
      </main>
    );
  }

  const gpFill = stats.totalCbm / CBM_20GP;
  const hqFill = stats.totalCbm / CBM_40HQ;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 pb-32 pt-3 sm:pb-10">
      <SheetHeader
        id={id}
        savedAt={savedAt}
        onBack={() => void navigate({ to: "/" })}
        onExport={() => void exportSheetExcel(id)}
        onSave={markSaved}
      />

      {jobCount > 0 ? (
        <p className="mt-3 rounded-2xl bg-pine/10 px-3 py-2 text-center text-sm text-pine">
          正在后台识别，还剩 {jobCount} 张。离开页面也不会中断，照片已保存在本机。
        </p>
      ) : null}

      <section className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="SKU" value={String(stats.count)} />
        <Stat label="合计 CBM" value={formatNum(stats.totalCbm, 3)} />
        <Stat label="已确认" value={`${stats.ready}/${stats.count}`} />
      </section>
      <p className="mt-2 text-center text-[11px] text-ink/45">
        20GP {Math.round(gpFill * 100)}% · 40HQ {Math.round(hqFill * 100)}%
      </p>

      <div className="mt-4 hidden sm:block">
        <PhotoPicker
          onFiles={(files) => void addPhotos(id, files)}
          cameraClassName="btn-primary"
          albumClassName="btn-ghost"
        />
        <button type="button" className="btn-ghost mt-2" onClick={() => void recognizePending(id)}>
          <Sparkles className="size-4" />
          识别未处理
        </button>
      </div>

      <ul className="mt-4 grid gap-3">
        {skus.map((sku, i) => (
          <li key={sku.id}>
            <SkuCard sku={sku} index={i + 1} onOpen={setEditing} />
          </li>
        ))}
      </ul>

      <SkuEditor
        sku={editing}
        thumb={editing ? thumbs[editing.id] : undefined}
        open={Boolean(editing)}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        onSave={(skuId, patch) => void updateSku(skuId, patch)}
        onDelete={(skuId) => void deleteSku(skuId)}
        onRecognize={(skuId) => void recognizeSku(skuId)}
      />

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/8 bg-cream/95 p-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <PhotoPicker
            onFiles={(files) => void addPhotos(id, files)}
            className="flex-1"
            cameraClassName="btn-ghost flex-1"
            albumClassName="btn-ghost flex-1"
          />
          <button type="button" className="btn-ghost px-3" onClick={() => void recognizePending(id)}>
            <Sparkles className="size-4" />
          </button>
          <button type="button" className="btn-ghost px-3" onClick={markSaved}>
            <Save className="size-4" />
          </button>
          <button type="button" className="btn-primary px-3" onClick={() => void exportSheetExcel(id)}>
            <Download className="size-4" />
            导出
          </button>
        </div>
      </footer>
    </main>
  );
}

function SheetHeader({
  id,
  savedAt,
  onBack,
  onExport,
  onSave,
}: {
  id: string;
  savedAt: number;
  onBack: () => void;
  onExport: () => void;
  onSave: () => void;
}) {
  const sheet = useQuote((s) => s.sheets.find((x) => x.id === id));
  const updateSheet = useQuote((s) => s.updateSheet);
  const [name, setName] = useState(sheet?.clientName ?? "");
  const [nation, setNation] = useState(sheet?.country ?? "");
  const [shop, setShop] = useState(sheet?.shopName ?? "");
  const [markup, setMarkup] = useState(String(sheet?.markupPct ?? 0));

  useEffect(() => {
    const s = useQuote.getState().sheets.find((x) => x.id === id);
    if (!s) return;
    setName(s.clientName);
    setNation(s.country);
    setShop(s.shopName);
    setMarkup(String(s.markupPct));
  }, [id]);

  return (
    <>
      <header className="flex items-center gap-3">
        <button type="button" className="rounded-full p-2 hover:bg-ink/5" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-lg font-medium outline-none"
            value={name}
            placeholder="客户名"
            onChange={(e) => {
              setName(e.target.value);
              void updateSheet(id, { clientName: e.target.value });
            }}
          />
          <input
            className="w-full bg-transparent text-xs text-ink/55 outline-none"
            value={nation}
            placeholder="国家，例如 哥伦比亚"
            onChange={(e) => {
              setNation(e.target.value);
              void updateSheet(id, { country: e.target.value });
            }}
          />
        </div>
        <p className="hidden text-[11px] text-ink/40 sm:block">{savedAt ? "已自动保存" : "写入本机"}</p>
        <button type="button" className="btn-ghost hidden sm:inline-flex" onClick={onSave}>
          <Save className="size-4" />
          保存
        </button>
        <button type="button" className="btn-primary hidden sm:inline-flex" onClick={onExport}>
          <Download className="size-4" />
          导出 Excel
        </button>
      </header>
      <div className="mt-3 flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink/50">
          店面
          <input
            className="field py-1"
            value={shop}
            placeholder="当前档口，新照片会带上"
            onChange={(e) => {
              setShop(e.target.value);
              void updateSheet(id, { shopName: e.target.value });
            }}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink/50">
          加价
          <input
            className="field w-16 py-1 text-center"
            inputMode="decimal"
            value={markup}
            onChange={(e) => {
              setMarkup(e.target.value);
              void updateSheet(id, { markupPct: Number(e.target.value) || 0 });
            }}
          />
          %
        </label>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-2 py-3">
      <p className="text-[10px] tracking-wide text-ink/40">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
