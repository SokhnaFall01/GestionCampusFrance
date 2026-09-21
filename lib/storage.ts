import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

// Stockage local sur disque en développement.
// Pour la mise en ligne (serverless), on remplacera ces fonctions par un
// stockage objet (Supabase Storage / S3) — voir README.

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
export const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

export interface StoredFile {
  storedName: string;
  fileName: string;
  mimeType: string;
  size: number;
}

function candidateDir(candidateId: string): string {
  return path.join(UPLOAD_DIR, candidateId);
}

export async function saveUpload(candidateId: string, file: File): Promise<StoredFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Fichier trop volumineux (max 10 Mo).");
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error("Format non autorisé (PDF ou image uniquement).");
  }

  const dir = candidateDir(candidateId);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return {
    storedName,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export async function readUpload(candidateId: string, storedName: string): Promise<Buffer> {
  return readFile(path.join(candidateDir(candidateId), storedName));
}

export async function deleteUpload(candidateId: string, storedName: string): Promise<void> {
  try {
    await unlink(path.join(candidateDir(candidateId), storedName));
  } catch {
    // fichier déjà absent : on ignore
  }
}
