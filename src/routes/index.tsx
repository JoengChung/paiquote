import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Calendar, Plus, Trash2 } from "lucide-react";
import { useQuote } from "@/lib/quote/store";

export const Route = createFileRoute("/")({ component: Home });

const STEPS = [
  { n: "01", title: "拍", sub: "一货一图" },
  { n: "02", title: "核", sub: "改手写数字" },
  { n: "03", title: "出", sub: "Excel 嵌图" },
];

function todayName() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function Home() {
  const navigate = useNavigate();
  const ready = useQuote((s) => s.ready);
  const sheets = useQuote((s) => s.sheets);
  const skus = useQuote((s) => s.skus);
  const hydrate = useQuote((s) => s.hydrate);
  const createSheet = useQuote((s) => s.createSheet);
  const deleteSheet = useQuote((s) => s.deleteSheet);
  const restoreSample = useQuote((s) => s.restoreSample);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  async function onCreate() {
    if (busy) return;
    setBusy(true);
    try {
      const id = await createSheet(todayName(), "");
      await navigate({ to: "/sheet/$id", params: { id } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-20 pt-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="text-[11px] tracking-[0.28em] text-ink/45">YIWU · 跟单</p>
          <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-tight text-ink">拍报价</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/55">
            市场里拍一张货，地上的价、装箱、体积自动进表。当晚把带图 Excel 发给客户。
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button type="button" className="btn-primary h-12 px-5" disabled={busy} onClick={() => void onCreate()}>
            <Plus className="size-4" />
            {busy ? "正在开单…" : "新建报价单"}
          </button>
          <a
            className="btn-ghost h-11 px-5"
            href="/paiquote-source.zip"
            download="拍报价-PaiQuote.zip"
          >
            下载源码包
          </a>
        </div>
      </header>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-3xl bg-white px-5 py-5 shadow-[0_1px_0_rgba(27,25,22,0.04)]">
            <p className="text-[11px] text-ink/35">{step.n}</p>
            <p className="mt-3 text-xl font-semibold text-ink">{step.title}</p>
            <p className="mt-1 text-sm text-ink/45">{step.sub}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-ink/45">今日与历史</p>
          <button
            type="button"
            className="text-sm text-pine hover:underline"
            onClick={async () => {
              const id = await restoreSample();
              void navigate({ to: "/sheet/$id", params: { id } });
            }}
          >
            恢复样品单
          </button>
        </div>
        {!ready ? (
          <div className="h-20 animate-pulse rounded-3xl bg-white/70" />
        ) : sheets.length === 0 ? (
          <p className="rounded-3xl bg-white px-5 py-8 text-sm text-ink/45">还没有报价单。点右上角新建一张。</p>
        ) : (
          <ul className="grid gap-3">
            {sheets.map((sheet) => {
              const n = skus.filter((s) => s.sheetId === sheet.id).length;
              const day = new Date(sheet.updatedAt).toISOString().slice(0, 10);
              return (
                <li key={sheet.id}>
                  <div className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(27,25,22,0.04)]">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => void navigate({ to: "/sheet/$id", params: { id: sheet.id } })}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-pine">
                        <Calendar className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">{sheet.clientName}</span>
                        <span className="block text-xs text-ink/40">
                          {day} · {n} SKU
                          {sheet.country ? ` · ${sheet.country}` : ""}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-ink/30" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-ink/30 hover:bg-ink/5 hover:text-ink/70"
                      aria-label="删除"
                      onClick={() => void deleteSheet(sheet.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
