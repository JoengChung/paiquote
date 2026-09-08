export type SkuStatus = "pending" | "reading" | "review" | "ready" | "error";

export type Sheet = {
  id: string;
  clientName: string;
  country: string;
  shopName: string;
  markupPct: number;
  createdAt: number;
  updatedAt: number;
};

export type Sku = {
  id: string;
  sheetId: string;
  shopName: string;
  factoryCode: string;
  nameZh: string;
  nameEs: string;
  cartons: number | null;
  packingQty: number | null;
  unitPriceCny: number | null;
  cbm: number | null;
  weightKg: number | null;
  notes: string;
  status: SkuStatus;
  error?: string;
  createdAt: number;
};

export type ExtractedSku = {
  factoryCode: string;
  nameZh: string;
  nameEs: string;
  unitPriceCny: number | null;
  packingQty: number | null;
  cbm: number | null;
  weightKg: number | null;
  notes: string;
};

export const CBM_20GP = 28;
export const CBM_40HQ = 68;
