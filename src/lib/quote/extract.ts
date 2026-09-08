import { createServerFn } from "@tanstack/react-start";
import type { ExtractedSku } from "./types";

const PROMPT = `你是义乌外贸跟单助手。照片里通常是一件货 + 地上手写数字。字的顺序不固定。
从图片中提取 JSON，不要 markdown：
{
  "factoryCode": "工厂货号，如 KS86A，没有就留空",
  "nameZh": "简短中文品名，看得到货就写，看不清就留空",
  "nameEs": "对应的简单西班牙语品名，看不清就留空",
  "unitPriceCny": 人民币单价数字或 null,
  "packingQty": 装箱量 PCS 数字或 null,
  "cbm": 体积立方米数字或 null,
  "weightKg": 毛重公斤或 null,
  "notes": "其他看到的备注"
}
只返回 JSON。单价常见 ¥ / 元；装箱常见 PCS / 箱；体积常见 0.0xx。货号常见字母+数字。`;

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const extractFromPhoto = createServerFn({ method: "POST" })
  .validator((input: { imageDataUrl: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; sku: ExtractedSku } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "识图暂不可用，请先手工填写" };
    }
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 400,
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: data.imageDataUrl } },
                { type: "text", text: PROMPT },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 403 || /spending|quota|limit/i.test(text)) {
          return { ok: false, error: "识图额度暂不可用，请先手工填写" };
        }
        return { ok: false, error: "识图失败，请先手工填写" };
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = body.choices?.[0]?.message?.content ?? "";
      const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      return {
        ok: true,
        sku: {
          factoryCode: asStr(parsed.factoryCode),
          nameZh: asStr(parsed.nameZh),
          nameEs: asStr(parsed.nameEs),
          unitPriceCny: asNum(parsed.unitPriceCny),
          packingQty: asNum(parsed.packingQty),
          cbm: asNum(parsed.cbm),
          weightKg: asNum(parsed.weightKg),
          notes: asStr(parsed.notes),
        },
      };
    } catch {
      return { ok: false, error: "识图失败，请先手工填写" };
    }
  });
