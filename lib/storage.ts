import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Stockage des fichiers déposés.
// - En production : Supabase Storage (bucket privé) si les variables
//   SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies.
// - Sinon (dev / self-hosted avec disque) : stockage local sur disque.

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "documents";

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

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

// --- Client Supabase (créé une seule fois) ---
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return supabase;
}

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const client = getSupabase();
  const { data } = await client.storage.getBucket(BUCKET);
  if (!data) {
    await client.storage.createBucket(BUCKET, { public: false });
  }
  bucketReady = true;
}

function validate(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error("Fichier trop volumineux (max 10 Mo).");
  if (!ALLOWED_MIME.includes(file.type))
    throw new Error("Format non autorisé (PDF ou image uniquement).");
}

function objectPath(candidateId: string, storedName: string) {
  return `${candidateId}/${storedName}`;
}

// --- API publique ---

export async function saveUpload(candidateId: string, file: File): Promise<StoredFile> {
  validate(file);
  const ext = path.extname(file.name) || "";
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (useSupabase) {
    await ensureBucket();
    const { error } = await getSupabase()
      .storage.from(BUCKET)
      .upload(objectPath(candidateId, storedName), buffer, {
        contentType: file.type,
        upsert: true,
      });
    if (error) throw new Error(`Échec de l'envoi : ${error.message}`);
  } else {
    const dir = path.join(UPLOAD_DIR, candidateId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, storedName), buffer);
  }

  return { storedName, fileName: file.name, mimeType: file.type, size: file.size };
}

export async function readUpload(candidateId: string, storedName: string): Promise<Buffer> {
  if (useSupabase) {
    const { data, error } = await getSupabase()
      .storage.from(BUCKET)
      .download(objectPath(candidateId, storedName));
    if (error || !data) throw new Error("Fichier introuvable.");
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(path.join(UPLOAD_DIR, candidateId, storedName));
}

export async function deleteUpload(candidateId: string, storedName: string): Promise<void> {
  try {
    if (useSupabase) {
      await getSupabase().storage.from(BUCKET).remove([objectPath(candidateId, storedName)]);
    } else {
      await unlink(path.join(UPLOAD_DIR, candidateId, storedName));
    }
  } catch {
    // fichier déjà absent : on ignore
  }
}
