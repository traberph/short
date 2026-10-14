import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomToken } from "./crypto.js";
import { HttpError } from "./errors.js";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const NAME_PATTERN = /^[A-Za-z0-9_-]+\.(png|jpg|webp)$/;

export const CONTENT_TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;
type Ext = keyof typeof CONTENT_TYPES;

// Detects the image type from its first bytes instead of trusting the upload's content type.
function sniff(bytes: Uint8Array): Ext | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

const mediaDir = (dataDir: string) => path.join(dataDir, "media");

export async function saveAvatar(dataDir: string, file: File): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) throw new HttpError(413, "Image must be smaller than 2 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) throw new HttpError(415, "Only PNG, JPEG and WebP images are allowed");
  const name = `${randomToken(16)}.${ext}`;
  mkdirSync(mediaDir(dataDir), { recursive: true });
  writeFileSync(path.join(mediaDir(dataDir), name), bytes);
  return name;
}

export function readMedia(dataDir: string, name: string): { bytes: Buffer; type: string } | null {
  const match = name.match(NAME_PATTERN);
  if (!match) return null;
  try {
    return { bytes: readFileSync(path.join(mediaDir(dataDir), name)), type: CONTENT_TYPES[match[1] as Ext] };
  } catch {
    return null;
  }
}

export function removeMedia(dataDir: string, name: string): void {
  if (!NAME_PATTERN.test(name)) return;
  try {
    unlinkSync(path.join(mediaDir(dataDir), name));
  } catch {
    // Already gone.
  }
}
