"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, getSessionFromId } from "@/lib/auth";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { logEvent } from "@/lib/events";

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

// Récupère la fiche du candidat : cookie d'abord, sinon jeton du formulaire.
async function candidateFromForm(formData: FormData) {
  let s = await getSession();
  if (!s) s = await getSessionFromId(str(formData.get("_sid")));
  if (!s || s.role !== "CANDIDATE") return null;
  return prisma.candidate.findUnique({ where: { userId: s.sub } });
}

function refresh(candidateId: string) {
  revalidatePath("/candidat");
  revalidatePath(`/admin/etudiants/${candidateId}`);
  revalidatePath("/admin");
}

export interface UploadState {
  error?: string;
  ok?: boolean;
}

// Dépôt d'un fichier par le candidat sur une pièce attendue.
export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const candidate = await candidateFromForm(formData);
  if (!candidate) return { error: "Session expirée. Reconnectez-vous puis réessayez." };
  const documentId = str(formData.get("documentId"));
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez choisir un fichier." };
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { documentType: true },
  });
  if (!doc || doc.candidateId !== candidate.id) {
    return { error: "Document introuvable." };
  }

  try {
    // Supprime l'ancien fichier s'il existe.
    if (doc.storedName) await deleteUpload(candidate.id, doc.storedName);

    const stored = await saveUpload(candidate.id, file);
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: "DEPOSE",
        fileName: stored.fileName,
        storedName: stored.storedName,
        mimeType: stored.mimeType,
        size: stored.size,
        reviewNote: null,
        uploadedAt: new Date(),
      },
    });
    await logEvent(
      candidate.id,
      "DOCUMENT",
      `Document déposé : ${doc.documentType.label}`,
      "CANDIDATE",
    );
    refresh(candidate.id);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec du dépôt." };
  }
}

// Ajout d'un vœu / projet d'études par le candidat.
export interface WishState {
  error?: string;
  ok?: boolean;
}

export async function addStudyWish(_prev: WishState, formData: FormData): Promise<WishState> {
  const candidate = await candidateFromForm(formData);
  if (!candidate) return { error: "Session expirée. Reconnectez-vous puis réessayez." };
  const fieldOfStudy = str(formData.get("fieldOfStudy"));
  const formationName = str(formData.get("formationName"));
  const establishment = str(formData.get("establishment")) || null;
  const level = str(formData.get("level")) || null;
  const city = str(formData.get("city")) || null;
  const motivation = str(formData.get("motivation")) || null;

  if (!fieldOfStudy || !formationName) {
    return { error: "Le domaine et l'intitulé de la formation sont obligatoires." };
  }

  await prisma.studyWish.create({
    data: { candidateId: candidate.id, fieldOfStudy, formationName, establishment, level, city, motivation },
  });
  await logEvent(candidate.id, "NOTE", `Nouveau vœu : ${formationName}`, "CANDIDATE");
  refresh(candidate.id);
  return { ok: true };
}

export async function deleteStudyWish(formData: FormData) {
  const candidate = await candidateFromForm(formData);
  if (!candidate) return;
  const wishId = str(formData.get("wishId"));
  const wish = await prisma.studyWish.findUnique({ where: { id: wishId } });
  if (wish && wish.candidateId === candidate.id) {
    await prisma.studyWish.delete({ where: { id: wishId } });
    refresh(candidate.id);
  }
}
