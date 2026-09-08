import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Sku } from "@/lib/quote/types";

type Draft = Pick<
  Sku,
  "shopName" | "factoryCode" | "nameZh" | "nameEs" | "cartons" | "unitPriceCny" | "packingQty" | "cbm" | "notes"
>;

export function SkuEditor({
  sku,
  thumb,
  open,
  onOpenChange,
  onSave,
  onDelete,
  onRecognize,
}: {
  sku: Sku | null;
  thumb?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (id: string, patch: Partial<Sku>) => void;
  onDelete: (id: string) => void;
  onRecognize: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (!sku) {
      setDraft(null);
      return;
    }
    setDraft({
      shopName: sku.shopName,
      factoryCode: sku.factoryCode,
      nameZh: sku.nameZh,
      nameEs: sku.nameEs,
      cartons: sku.cartons,
      unitPriceCny: sku.unitPriceCny,
      packingQty: sku.packingQty,
      cbm: sku.cbm,
      notes: sku.notes,
    });
  }, [sku]);

  if (!sku || !draft) return null;

  const num = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? null : n;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="mb-4 flex items-start justify-between gap-3 pr-8">
            <div>
              <Dialog.Title className="text-lg font-medium">核对这条货</Dialog.Title>
              <Dialog.Description className="text-sm text-ink/55">
                单价、装箱、体积务必看一眼再确认
              </Dialog.Description>
            </div>
            <Dialog.Close className="absolute right-4 top-4 rounded-full p-1 text-ink/50 hover:bg-ink/8">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {thumb ? (
            <img src={thumb} alt="" className="mb-4 max-h-56 w-full rounded-2xl object-cover" />
          ) : null}
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="店面">
                <input
                  value={draft.shopName}
                  onChange={(e) => setDraft({ ...draft, shopName: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="工厂货号">
                <input
                  value={draft.factoryCode}
                  onChange={(e) => setDraft({ ...draft, factoryCode: e.target.value })}
                  className="field"
                />
              </Field>
            </div>
            <Field label="中文描述">
              <input
                value={draft.nameZh}
                onChange={(e) => setDraft({ ...draft, nameZh: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="西班牙语描述">
              <input
                value={draft.nameEs}
                onChange={(e) => setDraft({ ...draft, nameEs: e.target.value })}
                className="field"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="件数">
                <input
                  inputMode="numeric"
                  value={draft.cartons ?? ""}
                  onChange={(e) => setDraft({ ...draft, cartons: num(e.target.value) })}
                  className="field"
                />
              </Field>
              <Field label="装箱量">
                <input
                  inputMode="numeric"
                  value={draft.packingQty ?? ""}
                  onChange={(e) => setDraft({ ...draft, packingQty: num(e.target.value) })}
                  className="field"
                />
              </Field>
              <Field label="单价 CNY">
                <input
                  inputMode="decimal"
                  value={draft.unitPriceCny ?? ""}
                  onChange={(e) => setDraft({ ...draft, unitPriceCny: num(e.target.value) })}
                  className="field"
                />
              </Field>
              <Field label="立方 CBM">
                <input
                  inputMode="decimal"
                  value={draft.cbm ?? ""}
                  onChange={(e) => setDraft({ ...draft, cbm: num(e.target.value) })}
                  className="field"
                />
              </Field>
            </div>
            <Field label="备注">
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="field"
              />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                onSave(sku.id, { ...draft, status: "ready", error: undefined });
                onOpenChange(false);
              }}
            >
              确认无误
            </button>
            <button type="button" className="btn-ghost" onClick={() => onRecognize(sku.id)}>
              再识别
            </button>
            <button
              type="button"
              className="btn-ghost text-red-700"
              onClick={() => {
                onDelete(sku.id);
                onOpenChange(false);
              }}
            >
              删除
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-ink/50">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
