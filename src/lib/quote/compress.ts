export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function drawToBlob(
  source: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法压缩图片");
  ctx.drawImage(source, 0, 0, w, h);
  source.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("图片压缩失败");
  return blob;
}

export async function compressImage(file: Blob, maxEdge = 1600, quality = 0.78): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  return drawToBlob(bitmap, maxEdge, quality);
}

export async function makeThumb(file: Blob): Promise<Blob> {
  return compressImage(file, 360, 0.7);
}

export async function fetchPublicAsBlob(path: string): Promise<Blob> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`无法读取 ${path}`);
  return res.blob();
}
