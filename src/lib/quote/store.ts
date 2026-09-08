import { create } from "zustand";
import { toast } from "sonner";
import { uid } from "@/lib/utils";
import { compressImage, fetchPublicAsBlob, makeThumb, blobToDataUrl } from "./compress";
import { extractFromPhoto } from "./extract";
import type { Sheet, Sku } from "./types";

type PhotoRecord = { full: Blob; thumb: Blob };

type QuoteState = {
  ready: boolean;
  savedAt: number;
  jobCount: number;
  sheets: Sheet[];
  skus: Sku[];
  thumbs: Record<string, string>;
  hydrate: () => Promise<void>;
  createSheet: (clientName: string, country: string) => Promise<string>;
  updateSheet: (id: string, patch: Partial<Sheet>) => Promise<void>;
  deleteSheet: (id: string) => Promise<void>;
  addPhotos: (sheetId: string, files: File[]) => Promise<void>;
  updateSku: (id: string, patch: Partial<Sku>) => Promise<void>;
  deleteSku: (id: string) => Promise<void>;
  recognizeSku: (id: string) => Promise<void>;
  recognizePending: (sheetId: string) => Promise<void>;
  exportSheetExcel: (sheetId: string) => Promise<void>;
  restoreSample: () => Promise<string>;
  ensureThumb: (id: string) => Promise<void>;
  markSaved: () => void;
};

const SAMPLE_ID = "sheet_sample_maria";
const recognizeJobs: string[] = [];
let pumping = false;

function dbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("paiquote", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sheets")) db.createObjectStore("sheets", { keyPath: "id" });
      if (!db.objectStoreNames.contains("skus")) db.createObjectStore("skus", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putAll(store: string, value: unknown, key?: string) {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  if (key) tx.objectStore(store).put(value, key);
  else tx.objectStore(store).put(value);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function delKey(store: string, key: string) {
  const db = await openDb();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return dbReq(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>;
}

async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await openDb();
  return dbReq(db.transaction("photos").objectStore("photos").get(id));
}

function skuOf(sheetId: string, extra: Partial<Sku> = {}): Sku {
  return {
    id: extra.id ?? uid("sku"),
    sheetId,
    shopName: extra.shopName ?? "",
    factoryCode: extra.factoryCode ?? "",
    nameZh: extra.nameZh ?? "",
    nameEs: extra.nameEs ?? "",
    cartons: extra.cartons ?? 1,
    packingQty: extra.packingQty ?? null,
    unitPriceCny: extra.unitPriceCny ?? null,
    cbm: extra.cbm ?? null,
    weightKg: extra.weightKg ?? null,
    notes: extra.notes ?? "",
    status: extra.status ?? "pending",
    createdAt: extra.createdAt ?? Date.now(),
  };
}

async function writeSampleSheet() {
  const now = Date.now();
  const sheet: Sheet = {
    id: SAMPLE_ID,
    clientName: "Maria",
    country: "哥伦比亚",
    shopName: "釉妮化妆品27161",
    markupPct: 0,
    createdAt: now,
    updatedAt: now,
  };
  await putAll("sheets", sheet);
  const samples: Array<{ file: string; sku: Partial<Sku> }> = [
    {
      file: "/samples/beauty.jpg",
      sku: {
        shopName: "釉妮化妆品27161",
        factoryCode: "BTY01",
        nameZh: "美容导入仪",
        nameEs: "Aparato de belleza",
        cartons: 1,
        unitPriceCny: 30.5,
        packingQty: 60,
        cbm: 0.055,
        status: "ready",
      },
    },
    {
      file: "/samples/spatulas.jpg",
      sku: {
        shopName: "釉妮化妆品27161",
        factoryCode: "SP48",
        nameZh: "硅胶锅铲套装",
        nameEs: "Juego de espátulas",
        cartons: 1,
        unitPriceCny: 12.8,
        packingQty: 48,
        cbm: 0.042,
        status: "review",
      },
    },
    {
      file: "/samples/speaker.jpg",
      sku: {
        shopName: "釉妮化妆品27161",
        factoryCode: "BT18",
        nameZh: "蓝牙小音箱",
        nameEs: "Altavoz Bluetooth",
        cartons: 1,
        unitPriceCny: 18,
        packingQty: 40,
        cbm: 0.038,
        status: "review",
      },
    },
    {
      file: "/samples/clips.jpg",
      sku: {
        shopName: "釉妮化妆品27161",
        factoryCode: "HC200",
        nameZh: "彩色发夹",
        nameEs: "Horquillas de colores",
        cartons: 1,
        unitPriceCny: 4.2,
        packingQty: 200,
        cbm: 0.028,
        status: "ready",
      },
    },
  ];
  for (const s of samples) {
    const sku = skuOf(SAMPLE_ID, s.sku);
    try {
      const blob = await fetchPublicAsBlob(s.file);
      await putAll("photos", { full: blob, thumb: blob }, sku.id);
    } catch {
      /* sample photo optional */
    }
    await putAll("skus", sku);
  }
  return sheet;
}

async function seedSample() {
  const sheets = await getAll<Sheet>("sheets");
  if (sheets.length) return;
  await writeSampleSheet();
}

async function runRecognize(get: () => QuoteState, id: string) {
  const sku = get().skus.find((s) => s.id === id);
  if (!sku) return;
  const prev = sku.status;
  await get().updateSku(id, { status: "reading", error: undefined });
  const photo = await getPhoto(id);
  if (!photo?.full) {
    await get().updateSku(id, { status: "error", error: "没有照片" });
    return;
  }
  const compact = await compressImage(photo.full, 1024, 0.7);
  const imageDataUrl = await blobToDataUrl(compact);
  const result = await extractFromPhoto({ data: { imageDataUrl } });
  if (!result.ok) {
    await get().updateSku(id, { status: prev === "ready" ? "ready" : "error", error: result.error });
    toast.error(result.error);
    return;
  }
  await get().updateSku(id, {
    ...result.sku,
    factoryCode: result.sku.factoryCode || sku.factoryCode,
    nameZh: result.sku.nameZh || sku.nameZh,
    nameEs: result.sku.nameEs || sku.nameEs,
    status: "review",
    error: undefined,
  });
}

async function pumpRecognize(get: () => QuoteState, set: (p: Partial<QuoteState>) => void) {
  if (pumping) return;
  pumping = true;
  while (recognizeJobs.length) {
    const id = recognizeJobs.shift()!;
    set({ jobCount: recognizeJobs.length });
    try {
      await runRecognize(get, id);
    } catch (err) {
      console.error(err);
    }
  }
  pumping = false;
  set({ jobCount: 0 });
  toast.success("本批识别完成，已写入本机");
}

export const useQuote = create<QuoteState>((set, get) => ({
  ready: false,
  savedAt: 0,
  jobCount: 0,
  sheets: [],
  skus: [],
  thumbs: {},

  hydrate: async () => {
    if (get().ready) return;
    if (typeof indexedDB === "undefined") {
      set({ ready: true });
      return;
    }
    try {
      await seedSample();
      const memSheets = get().sheets;
      const memSkus = get().skus;
      const sheets = (await getAll<Sheet>("sheets")).sort((a, b) => b.updatedAt - a.updatedAt).map((s) => ({
        ...s,
        shopName: s.shopName ?? "",
        markupPct: s.markupPct ?? 0,
      }));
      const skus = (await getAll<Sku>("skus")).sort((a, b) => a.createdAt - b.createdAt).map((s) => ({
        ...s,
        shopName: s.shopName ?? "",
        factoryCode: s.factoryCode ?? "",
        cartons: s.cartons ?? 1,
        status: s.status === "reading" ? "pending" : s.status,
      }));
      const extraSheets = memSheets.filter((s) => !sheets.some((d) => d.id === s.id));
      const extraSkus = memSkus.filter((s) => !skus.some((d) => d.id === s.id));
      set({
        ready: true,
        savedAt: Date.now(),
        sheets: [...extraSheets, ...sheets].sort((a, b) => b.updatedAt - a.updatedAt),
        skus: [...extraSkus, ...skus].sort((a, b) => a.createdAt - b.createdAt),
      });
    } catch (err) {
      console.error(err);
      toast.error("本地存储不可用，刷新后再试");
      set({ ready: true });
    }
  },

  createSheet: async (clientName, country) => {
    const sheet: Sheet = {
      id: uid("sheet"),
      clientName: clientName.trim() || "未命名客户",
      country: country.trim() || "",
      shopName: "",
      markupPct: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set({ sheets: [sheet, ...get().sheets] });
    try {
      await putAll("sheets", sheet);
    } catch (err) {
      console.error(err);
    }
    return sheet.id;
  },

  updateSheet: async (id, patch) => {
    const current = get().sheets.find((s) => s.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updatedAt: Date.now() };
    set({ sheets: get().sheets.map((s) => (s.id === id ? next : s)), savedAt: Date.now() });
    void putAll("sheets", next);
  },

  deleteSheet: async (id) => {
    const skus = get().skus.filter((s) => s.sheetId === id);
    for (const sku of skus) {
      await delKey("skus", sku.id);
      await delKey("photos", sku.id);
    }
    await delKey("sheets", id);
    set({
      sheets: get().sheets.filter((s) => s.id !== id),
      skus: get().skus.filter((s) => s.sheetId !== id),
    });
  },

  addPhotos: async (sheetId, files) => {
    const sheet = get().sheets.find((s) => s.id === sheetId);
    const added: Sku[] = [];
    const thumbs = { ...get().thumbs };
    for (const file of files) {
      const sku = skuOf(sheetId, { status: "pending", shopName: sheet?.shopName ?? "" });
      thumbs[sku.id] = URL.createObjectURL(file);
      added.push(sku);
    }
    set({ skus: [...get().skus, ...added], thumbs, savedAt: Date.now() });
    toast.success(`已加入 ${added.length} 张，正在写入本机`);
    void (async () => {
      for (const [i, file] of files.entries()) {
        const sku = added[i]!;
        try {
          const full = await compressImage(file, 1280, 0.72);
          const thumb = await makeThumb(full);
          await putAll("photos", { full, thumb }, sku.id);
          await putAll("skus", sku);
          const url = URL.createObjectURL(thumb);
          set({ thumbs: { ...get().thumbs, [sku.id]: url }, savedAt: Date.now() });
        } catch (err) {
          console.error(err);
          await get().updateSku(sku.id, { status: "error", error: "照片写入失败" });
        }
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
  },

  updateSku: async (id, patch) => {
    const current = get().skus.find((s) => s.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    set({ skus: get().skus.map((s) => (s.id === id ? next : s)), savedAt: Date.now() });
    void putAll("skus", next);
  },

  deleteSku: async (id) => {
    const current = get().skus.find((s) => s.id === id);
    await delKey("skus", id);
    await delKey("photos", id);
    set({ skus: get().skus.filter((s) => s.id !== id) });
    if (current) await get().updateSheet(current.sheetId, {});
  },

  recognizeSku: async (id) => {
    if (!recognizeJobs.includes(id)) recognizeJobs.push(id);
    set({ jobCount: recognizeJobs.length });
    void pumpRecognize(get, set);
  },

  recognizePending: async (sheetId) => {
    const list = get().skus.filter(
      (s) => s.sheetId === sheetId && (s.status === "pending" || s.status === "error"),
    );
    if (!list.length) {
      toast.message("没有待识别的照片");
      return;
    }
    for (const sku of list) {
      if (!recognizeJobs.includes(sku.id)) recognizeJobs.push(sku.id);
    }
    set({ jobCount: recognizeJobs.length });
    toast.message(`后台识别 ${list.length} 张，中途离开也会继续`);
    void pumpRecognize(get, set);
  },

  exportSheetExcel: async (sheetId) => {
    const sheet = get().sheets.find((s) => s.id === sheetId);
    if (!sheet) return;
    const skus = get().skus.filter((s) => s.sheetId === sheetId);
    if (!skus.length) {
      toast.error("还没有货");
      return;
    }
    const photos: Record<string, Blob> = {};
    for (const sku of skus) {
      const rec = await getPhoto(sku.id);
      if (rec?.full) photos[sku.id] = rec.full;
    }
    const { buildQuoteWorkbook } = await import("./excel");
    const blob = await buildQuoteWorkbook(sheet, skus, photos);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safe = `${sheet.clientName || "报价单"}`.replace(/[\\/]/g, "");
    a.download = `${safe}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    toast.success("报价单已下载");
  },

  restoreSample: async () => {
    if (get().sheets.some((s) => s.id === SAMPLE_ID)) return SAMPLE_ID;
    await writeSampleSheet();
    const sheets = (await getAll<Sheet>("sheets")).sort((a, b) => b.updatedAt - a.updatedAt);
    const skus = (await getAll<Sku>("skus")).sort((a, b) => a.createdAt - b.createdAt);
    const thumbs = { ...get().thumbs };
    for (const sku of skus.filter((s) => s.sheetId === SAMPLE_ID)) {
      if (thumbs[sku.id]) continue;
      const photo = await getPhoto(sku.id);
      if (photo?.thumb) thumbs[sku.id] = URL.createObjectURL(photo.thumb);
    }
    set({ ready: true, sheets, skus, thumbs });
    return SAMPLE_ID;
  },

  ensureThumb: async (id) => {
    if (get().thumbs[id]) return;
    const photo = await getPhoto(id);
    if (photo?.thumb && !get().thumbs[id]) {
      set({ thumbs: { ...get().thumbs, [id]: URL.createObjectURL(photo.thumb) } });
    }
  },

  markSaved: () => {
    set({ savedAt: Date.now() });
    toast.success("已保存在这台手机，关掉网页再打开还在");
  },
}));

export function sheetSkus(skus: Sku[], sheetId: string) {
  return skus.filter((s) => s.sheetId === sheetId);
}

export function sheetStats(skus: Sku[]) {
  const totalCbm = skus.reduce((n, s) => n + (s.cbm ?? 0), 0);
  const ready = skus.filter((s) => s.status === "ready").length;
  return { count: skus.length, ready, totalCbm };
}
