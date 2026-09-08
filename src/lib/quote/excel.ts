import type { Sheet, Sku } from "./types";
import type ExcelJS from "exceljs";

type PhotoMap = Record<string, Blob>;

const FONT: Partial<ExcelJS.Font> = { name: "宋体", size: 11 };
const RED: Partial<ExcelJS.Font> = { ...FONT, bold: true, color: { argb: "FFFF0000" } };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
const THIN: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF000000" } };
const BOX: Partial<ExcelJS.Borders> = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const CENTER: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center", wrapText: true };

const HEADERS = [
  "店面",
  "工厂货号",
  "图片",
  "中文描述",
  "西班牙语描述",
  "件数",
  "装箱量",
  "总数量",
  "单价",
  "总金额",
  "立方",
  "总立方",
];

const WIDTHS = [16, 12, 14, 14, 22, 8, 10, 10, 12, 14, 10, 10];

function styleCell(cell: ExcelJS.Cell, extra?: { font?: Partial<ExcelJS.Font>; fill?: ExcelJS.Fill; numFmt?: string }) {
  cell.font = extra?.font ?? FONT;
  cell.alignment = CENTER;
  cell.border = BOX as ExcelJS.Borders;
  if (extra?.fill) cell.fill = extra.fill;
  if (extra?.numFmt) cell.numFmt = extra.numFmt;
}

export async function buildQuoteWorkbook(sheet: Sheet, skus: Sku[], photos: PhotoMap) {
  const Excel = (await import("exceljs")).default;
  const wb = new Excel.Workbook();
  wb.creator = "拍报价 PaiQuote";
  const ws = wb.addWorksheet("报价单", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    properties: { defaultRowHeight: 18 },
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  ws.columns = HEADERS.map((header, i) => ({ header, width: WIDTHS[i] }));
  const head = ws.getRow(1);
  head.height = 22;
  head.eachCell((cell) => styleCell(cell, { font: { ...FONT, bold: true }, fill: HEADER_FILL }));

  const factor = 1 + (sheet.markupPct || 0) / 100;
  const lastData = skus.length + 1;

  for (let i = 0; i < skus.length; i += 1) {
    const sku = skus[i]!;
    const r = i + 2;
    const row = ws.getRow(r);
    row.height = 78;
    const price = sku.unitPriceCny != null ? Number((sku.unitPriceCny * factor).toFixed(2)) : null;
    row.getCell(1).value = sku.shopName || sheet.shopName || "";
    row.getCell(2).value = sku.factoryCode || "";
    row.getCell(3).value = "";
    row.getCell(4).value = sku.nameZh || "";
    row.getCell(5).value = sku.nameEs || "";
    row.getCell(6).value = sku.cartons ?? 1;
    row.getCell(7).value = sku.packingQty;
    row.getCell(8).value = { formula: `F${r}*G${r}` };
    row.getCell(9).value = price;
    row.getCell(10).value = { formula: `H${r}*I${r}` };
    row.getCell(11).value = sku.cbm;
    row.getCell(12).value = { formula: `IF(K${r}="","",F${r}*K${r})` };

    for (let c = 1; c <= 12; c += 1) {
      const fmt =
        c === 9 || c === 10 ? '"¥"#,##0.00' : c === 6 || c === 7 || c === 8 ? "#,##0" : c === 11 || c === 12 ? "0.000" : undefined;
      styleCell(row.getCell(c), { numFmt: fmt });
    }

    const photo = photos[sku.id];
    if (photo) {
      const bytes = new Uint8Array(await photo.arrayBuffer());
      const imgId = wb.addImage({ buffer: bytes as never, extension: "jpeg" });
      ws.addImage(imgId, {
        tl: { col: 2.12, row: r - 0.92 },
        ext: { width: 86, height: 86 },
        editAs: "oneCell",
      });
    }
  }

  // merge consecutive 店面
  let g = 0;
  while (g < skus.length) {
    const name = (skus[g]!.shopName || sheet.shopName || "").trim();
    let end = g;
    if (name) {
      while (end + 1 < skus.length && (skus[end + 1]!.shopName || sheet.shopName || "").trim() === name) {
        end += 1;
      }
      if (end > g) ws.mergeCells(g + 2, 1, end + 2, 1);
    }
    g = end + 1;
  }

  const totalRow = lastData + 1;
  const t = ws.getRow(totalRow);
  t.height = 22;
  for (let c = 1; c <= 12; c += 1) styleCell(t.getCell(c), { fill: TOTAL_FILL });
  if (skus.length) {
    t.getCell(2).value = "合计";
    t.getCell(2).font = RED;
    t.getCell(6).value = { formula: `SUM(F2:F${lastData})` };
    t.getCell(6).font = RED;
    t.getCell(6).numFmt = "#,##0";
    t.getCell(8).value = { formula: `SUM(H2:H${lastData})` };
    t.getCell(8).font = RED;
    t.getCell(8).numFmt = "#,##0";
    t.getCell(10).value = { formula: `SUM(J2:J${lastData})` };
    t.getCell(10).font = RED;
    t.getCell(10).numFmt = '"¥"#,##0.00';
    t.getCell(12).value = { formula: `SUM(L2:L${lastData})` };
    t.getCell(12).font = RED;
    t.getCell(12).numFmt = "0.000";
    ws.mergeCells(totalRow, 2, totalRow, 5);
  } else {
    t.getCell(2).value = "合计";
    t.getCell(2).font = RED;
    ws.mergeCells(totalRow, 2, totalRow, 5);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
