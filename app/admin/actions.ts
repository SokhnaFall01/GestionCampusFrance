"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { logEvent } from "@/lib/events";
import { computeProbability } from "@/lib/scoring";
import {
  DOCUMENT_TYPES,
  MAX_CANDIDATES,
  STAGES,
  STAGE_LABELS,
  DOCUMENT_LABELS,
  DECISION_LABELS,
  type Stage,
  type DocumentType,
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
  await requireAdmin();

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

  const password = providedPassword || generateTempPassword();
  const passwordHash = await hashPassword(password);

  const candidate = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: `${firstName} ${lastName}`, role: "CANDIDATE", passwordHash },
    });
    const cand = await tx.candidate.create({
      data: { userId: user.id, firstName, lastName, phone, city, academicLevel, dateOfBirth },
    });
    await tx.document.createMany({
      data: DOCUMENT_TYPES.map((type) => ({ candidateId: cand.id, type })),
    });
    return cand;
  });

  await logEvent(candidate.id, "SYSTEM", "Dossier créé", "ADMIN");
  revalidatePath("/admin");

  return { success: { candidateId: candidate.id, email, password } };
}

// --- Étape du dossier --------------------------------------------------------
export async function updateStage(formData: FormData) {
  await requireAdmin();
  const candidateId = str(formData.get("candidateId"));
  const stage = str(formData.get("stage")) as Stage;
  if (!candidateId || !STAGES.includes(stage)) return;

  await prisma.candidate.update({ where: { id: candidateId }, data: { stage } });
  await logEvent(candidateId, "STAGE", `Étape : ${STAGE_LABELS[stage]}`, "ADMIN");
  refresh(candidateId);
}

// --- Notes privées -----------------------------------------------------------
export async function saveNotes(formData: FormData) {
  await requireAdmin();
  const candidateId = str(formData.get("candidateId"));
  const notes = str(formData.get("notes")) || null;
  if (!candidateId) return;
  await prisma.candidate.update({ where: { id: candidateId }, data: { notes } });
  refresh(candidateId);
}

// --- Tâches / actions --------------------------------------------------------
export async function addTask(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const taskId = str(formData.get("taskId"));
  const candidateId = str(formData.get("candidateId"));
  await prisma.task.delete({ where: { id: taskId } }).catch(() => {});
  refresh(candidateId);
}

// --- Revue d'un document -----------------------------------------------------
export async function reviewDocument(formData: FormData) {
  await requireAdmin();
  const documentId = str(formData.get("documentId"));
  const candidateId = str(formData.get("candidateId"));
  const decision = str(formData.get("decision")); // VALIDE | REFUSE
  const reviewNote = str(formData.get("reviewNote")) || null;
  if (!documentId || !["VALIDE", "REFUSE"].includes(decision)) return;

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { status: decision, reviewNote },
  });
  await logEvent(
    candidateId,
    "DOCUMENT",
    `${DOCUMENT_LABELS[doc.type as DocumentType] ?? doc.type} : ${decision === "VALIDE" ? "validé" : "refusé"}`,
    "ADMIN",
  );
  refresh(candidateId);
}

// --- Évaluation / probabilité ------------------------------------------------
export async function saveAssessment(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const candidateId = str(formData.get("candidateId"));
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return;
  // Supprime le User → cascade sur la fiche et ses données liées.
  await prisma.user.delete({ where: { id: candidate.userId } }).catch(() => {});
  revalidatePath("/admin");
  redirect("/admin");
}
