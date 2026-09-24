"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromId, type SessionPayload } from "@/lib/auth";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { logEvent } from "@/lib/events";
import { computeProbability } from "@/lib/scoring";
import {
  MAX_CANDIDATES,
  DECISION_LABELS,
  type Mention,
  type FrenchLevel,
  type SelectivityLevel,
  type Decision,
} from "@/lib/constants";

function parseNum(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

// Vérifie que l'admin est authentifié via l'id de session transmis DANS le
// formulaire (champ caché "_sid"). Le cookie n'étant pas toujours transmis lors
// des envois de formulaires sur cet hébergement, on s'appuie sur ce champ.
async function adminFromForm(formData: FormData): Promise<SessionPayload | null> {
  const s = await getSessionFromId(str(formData.get("_sid")));
  return s && s.role === "ADMIN" ? s : null;
}

async function requireAdminForm(formData: FormData): Promise<void> {
  if (!(await adminFromForm(formData))) redirect("/login");
}

function refresh(candidateId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/etudiants/${candidateId}`);
}

// --- Création d'un étudiant ---------------------------------------------------
export interface CreateState {
  error?: string;
  success?: { candidateId: string; email: string; password: string };
}

export async function createStudent(_prev: CreateState, formData: FormData): Promise<CreateState> {
  if (!(await adminFromForm(formData))) {
    return { error: "Session expirée. Reconnectez-vous puis réessayez." };
  }

  const count = await prisma.candidate.count();
  if (count >= MAX_CANDIDATES) {
    return { error: `Limite atteinte : maximum ${MAX_CANDIDATES} apprenants suivis.` };
  }

  const firstName = str(formData.get("firstName"));
  const lastName = str(formData.get("lastName"));
  const email = str(formData.get("email")).toLowerCase();
  const phone = str(formData.get("phone")) || null;
  const city = str(formData.get("city")) || null;
  const academicLevel = str(formData.get("academicLevel")) || null;
  const dobRaw = str(formData.get("dateOfBirth"));
  const dateOfBirth = dobRaw ? new Date(dobRaw) : null;
  const providedPassword = str(formData.get("password"));

  if (!firstName || !lastName || !email) {
    return { error: "Prénom, nom et email sont obligatoires." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const [firstStage, docTypes] = await Promise.all([
    prisma.stage.findFirst({ orderBy: { order: "asc" } }),
    prisma.documentType.findMany({ select: { id: true } }),
  ]);

  const password = providedPassword || generateTempPassword();
  const passwordHash = await hashPassword(password);

  // Écritures séquentielles (pas de transaction interactive : celles-ci ne sont
  // pas fiables via le pooler Supabase en production). En cas d'échec après la
  // création du compte, on nettoie le compte orphelin.
  let createdUserId: string | null = null;
  try {
    const user = await prisma.user.create({
      data: { email, name: `${firstName} ${lastName}`, role: "CANDIDATE", passwordHash },
    });
    createdUserId = user.id;

    const candidate = await prisma.candidate.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phone,
        city,
        academicLevel,
        dateOfBirth,
        stageId: firstStage?.id ?? null,
      },
    });

    if (docTypes.length > 0) {
      await prisma.document.createMany({
        data: docTypes.map((dt) => ({ candidateId: candidate.id, documentTypeId: dt.id })),
      });
    }

    await logEvent(candidate.id, "SYSTEM", "Dossier créé", "ADMIN");
    revalidatePath("/admin");

    return { success: { candidateId: candidate.id, email, password } };
  } catch (e) {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    return {
      error: `Erreur lors de la création : ${e instanceof Error ? e.message : "inconnue"}`,
    };
  }
}

// --- Étape du dossier --------------------------------------------------------
export async function updateStage(formData: FormData) {
  await requireAdminForm(formData);
  const candidateId = str(formData.get("candidateId"));
  const stageId = str(formData.get("stageId"));
  if (!candidateId || !stageId) return;

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) return;

  await prisma.candidate.update({ where: { id: candidateId }, data: { stageId } });
  await logEvent(candidateId, "STAGE", `Étape : ${stage.label}`, "ADMIN");
  refresh(candidateId);
}

// --- Notes privées -----------------------------------------------------------
export async function saveNotes(formData: FormData) {
  await requireAdminForm(formData);
  const candidateId = str(formData.get("candidateId"));
  const notes = str(formData.get("notes")) || null;
  if (!candidateId) return;
  await prisma.candidate.update({ where: { id: candidateId }, data: { notes } });
  refresh(candidateId);
}

// --- Tâches / actions --------------------------------------------------------
export async function addTask(formData: FormData) {
  await requireAdminForm(formData);
  const candidateId = str(formData.get("candidateId"));
  const title = str(formData.get("title"));
  const description = str(formData.get("description")) || null;
  const dueRaw = str(formData.get("dueDate"));
  if (!candidateId || !title) return;

  await prisma.task.create({
    data: { candidateId, title, description, dueDate: dueRaw ? new Date(dueRaw) : null },
  });
  await logEvent(candidateId, "TASK", `Nouvelle action : ${title}`, "ADMIN");
  refresh(candidateId);
}

export async function toggleTask(formData: FormData) {
  await requireAdminForm(formData);
  const taskId = str(formData.get("taskId"));
  const candidateId = str(formData.get("candidateId"));
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { done: !task.done, doneAt: !task.done ? new Date() : null },
  });
  refresh(candidateId);
}

export async function deleteTask(formData: FormData) {
  await requireAdminForm(formData);
  const taskId = str(formData.get("taskId"));
  const candidateId = str(formData.get("candidateId"));
  await prisma.task.delete({ where: { id: taskId } }).catch(() => {});
  refresh(candidateId);
}

// --- Revue d'un document -----------------------------------------------------
export async function reviewDocument(formData: FormData) {
  await requireAdminForm(formData);
  const documentId = str(formData.get("documentId"));
  const candidateId = str(formData.get("candidateId"));
  const decision = str(formData.get("decision")); // VALIDE | REFUSE
  const reviewNote = str(formData.get("reviewNote")) || null;
  if (!documentId || !["VALIDE", "REFUSE"].includes(decision)) return;

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { status: decision, reviewNote },
    include: { documentType: true },
  });
  await logEvent(
    candidateId,
    "DOCUMENT",
    `${doc.documentType.label} : ${decision === "VALIDE" ? "validé" : "refusé"}`,
    "ADMIN",
  );
  refresh(candidateId);
}

// --- Évaluation / probabilité ------------------------------------------------
export async function saveAssessment(formData: FormData) {
  await requireAdminForm(formData);
  const candidateId = str(formData.get("candidateId"));
  if (!candidateId) return;

  const bacAverage = parseNum(formData.get("bacAverage"));
  const postBacAverage = parseNum(formData.get("postBacAverage"));
  const bacMention = (str(formData.get("bacMention")) || null) as Mention | null;
  const frenchLevel = (str(formData.get("frenchLevel")) || null) as FrenchLevel | null;
  const coherenceRating = parseNum(formData.get("coherenceRating"));
  const selectivityLevel = (str(formData.get("selectivityLevel")) || null) as SelectivityLevel | null;
  const comment = str(formData.get("comment")) || null;

  const result = computeProbability({
    bacAverage,
    postBacAverage,
    bacMention,
    frenchLevel,
    coherenceRating,
    selectivityLevel,
  });

  await prisma.assessment.upsert({
    where: { candidateId },
    create: {
      candidateId,
      bacAverage,
      postBacAverage,
      bacMention,
      frenchLevel,
      coherenceRating,
      selectivityLevel,
      comment,
      score: result.score,
      probabilityLevel: result.level,
    },
    update: {
      bacAverage,
      postBacAverage,
      bacMention,
      frenchLevel,
      coherenceRating,
      selectivityLevel,
      comment,
      score: result.score,
      probabilityLevel: result.level,
    },
  });

  await logEvent(
    candidateId,
    "ASSESSMENT",
    result.score !== null
      ? `Évaluation mise à jour · Probabilité ${result.score}/100`
      : "Évaluation mise à jour",
    "ADMIN",
  );
  refresh(candidateId);
}

// --- Décision d'acceptation --------------------------------------------------
export async function setDecision(formData: FormData) {
  await requireAdminForm(formData);
  const candidateId = str(formData.get("candidateId"));
  const decision = str(formData.get("decision")) as Decision;
  if (!candidateId || !["EN_ATTENTE", "ACCEPTE", "REFUSE"].includes(decision)) return;

  await prisma.assessment.upsert({
    where: { candidateId },
    create: { candidateId, decision },
    update: { decision },
  });
  await logEvent(candidateId, "DECISION", `Décision : ${DECISION_LABELS[decision]}`, "ADMIN");
  refresh(candidateId);
}

// --- Suppression d'un étudiant ----------------------------------------------
export async function deleteStudent(formData: FormData) {
  await requireAdminForm(formData);
  const candidateId = str(formData.get("candidateId"));
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return;
  await prisma.user.delete({ where: { id: candidate.userId } }).catch(() => {});
  revalidatePath("/admin");
  redirect("/admin");
}

// =============================================================================
//  PARAMÈTRES : gestion des étapes et des types de documents
// =============================================================================

function refreshSettings() {
  revalidatePath("/admin/parametres");
  revalidatePath("/admin");
  revalidatePath("/candidat");
}

// --- Étapes ---
export async function addStage(formData: FormData) {
  await requireAdminForm(formData);
  const label = str(formData.get("label"));
  if (!label) return;
  const last = await prisma.stage.findFirst({ orderBy: { order: "desc" } });
  await prisma.stage.create({ data: { label, order: (last?.order ?? 0) + 1 } });
  refreshSettings();
}

export async function renameStage(formData: FormData) {
  await requireAdminForm(formData);
  const id = str(formData.get("id"));
  const label = str(formData.get("label"));
  if (!id || !label) return;
  await prisma.stage.update({ where: { id }, data: { label } });
  refreshSettings();
}

export async function deleteStage(formData: FormData) {
  await requireAdminForm(formData);
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.stage.delete({ where: { id } }).catch(() => {});
  refreshSettings();
}

// --- Types de documents ---
export async function addDocumentType(formData: FormData) {
  await requireAdminForm(formData);
  const label = str(formData.get("label"));
  if (!label) return;

  const last = await prisma.documentType.findFirst({ orderBy: { order: "desc" } });
  const created = await prisma.documentType.create({
    data: { label, order: (last?.order ?? 0) + 1 },
  });

  // Ajoute cette pièce à la checklist de tous les étudiants déjà existants.
  const candidates = await prisma.candidate.findMany({ select: { id: true } });
  if (candidates.length > 0) {
    await prisma.document.createMany({
      data: candidates.map((c) => ({ candidateId: c.id, documentTypeId: created.id })),
    });
  }
  refreshSettings();
}

export async function renameDocumentType(formData: FormData) {
  await requireAdminForm(formData);
  const id = str(formData.get("id"));
  const label = str(formData.get("label"));
  if (!id || !label) return;
  await prisma.documentType.update({ where: { id }, data: { label } });
  refreshSettings();
}

export async function deleteDocumentType(formData: FormData) {
  await requireAdminForm(formData);
  const id = str(formData.get("id"));
  if (!id) return;
  // Cascade : supprime aussi les lignes Document liées (chez tous les candidats).
  await prisma.documentType.delete({ where: { id } }).catch(() => {});
  refreshSettings();
}
