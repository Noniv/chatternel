/**
 * Image attachments for chat messages.
 *
 * OpenRouter accepts images in the `image_url` content part of a chat message,
 * either as an https URL or as a base64 data URL. We only ever have local
 * files, so everything here produces `data:<mime>;base64,<data>` strings.
 * Accepted types are the ones OpenRouter documents: png, jpeg, webp and gif.
 */

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

/** Longest side we keep. Bigger images are downscaled before they are stored. */
const MAX_DIM = 1568;
/** Images below this stay untouched; above it they are re-encoded. */
const MAX_BYTES = 900 * 1024;
/** Hard limit on a single picked file. */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const MAX_IMAGES_PER_MESSAGE = 8;

export interface Attachment {
  id: string;
  name: string;
  /** data URL, ready to drop into an `image_url` content part. */
  url: string;
}

export function isSupportedImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

export function dataUrlBytes(url: string): number {
  const base64 = url.slice(url.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode the image."));
    img.src = url;
  });
}

/** Downscale to MAX_DIM and re-encode. WebP keeps transparency; JPEG is the fallback. */
function reencode(img: HTMLImageElement): string {
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const webp = canvas.toDataURL("image/webp", 0.85);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  if (!isSupportedImage(file)) {
    throw new Error(`${file.name}: only PNG, JPEG, WebP and GIF images are supported.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is too large (max 20 MB).`);
  }

  const original = await readAsDataUrl(file);
  const id = "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const name = file.name || "image";

  // Re-encoding a GIF would drop its animation, so it is always sent as-is.
  if (file.type === "image/gif") return { id, name, url: original };

  const img = await loadImage(original);
  const oversized = Math.max(img.naturalWidth, img.naturalHeight) > MAX_DIM;
  if (!oversized && dataUrlBytes(original) <= MAX_BYTES) return { id, name, url: original };

  const shrunk = reencode(img);
  return { id, name, url: shrunk.length < original.length ? shrunk : original };
}

/** Pulls image files out of a paste or drop. */
export function imageFilesFrom(items: DataTransfer | null): File[] {
  if (!items) return [];
  return Array.from(items.files).filter(isSupportedImage);
}
