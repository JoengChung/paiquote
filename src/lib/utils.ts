import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function formatCny(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `¥${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export function formatNum(n: number | null | undefined, digits = 3) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits).replace(/\.?0+$/, "") || "0";
}
