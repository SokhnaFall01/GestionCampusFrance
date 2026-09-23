import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Test d'écriture en base (réservé à un admin connecté) : reproduit la création
// d'un étudiant étape par étape, puis nettoie. Affiche l'erreur exacte si une
// écriture échoue. À utiliser pour diagnostiquer, puis à retirer.
export const dynamic = "force-dynamic";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Réservé à un administrateur connecté." },
      { status: 403 },
    );
  }

  const steps: Array<{ step: string; ok: boolean; info?: string }> = [];
  const email = `selftest_${Date.now()}@example.invalid`;
  let userId: string | null = null;
  let candidateId: string | null = null;

  try {
    const u = await prisma.user.create({
      data: { email, name: "Self Test", role: "CANDIDATE", passwordHash: "x" },
    });
    userId = u.id;
    steps.push({ step: "1. création compte (user)", ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, failedAt: "création compte", error: msg(e), steps });
  }

  try {
    const stage = await prisma.stage.findFirst({ orderBy: { order: "asc" } });
    const c = await prisma.candidate.create({
      data: { userId: userId!, firstName: "Self", lastName: "Test", stageId: stage?.id ?? null },
    });
    candidateId = c.id;
    steps.push({ step: "2. création fiche (candidate)", ok: true });
  } catch (e) {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    return NextResponse.json({ ok: false, failedAt: "création fiche", error: msg(e), steps });
  }

  try {
    const dts = await prisma.documentType.findMany({ select: { id: true } });
    if (dts.length > 0) {
      await prisma.document.createMany({
        data: dts.map((d) => ({ candidateId: candidateId!, documentTypeId: d.id })),
      });
    }
    steps.push({ step: "3. création documents", ok: true, info: `${dts.length} documents` });
  } catch (e) {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    return NextResponse.json({ ok: false, failedAt: "création documents", error: msg(e), steps });
  }

  // Nettoyage (cascade sur candidate + documents).
  await prisma.user.delete({ where: { id: userId! } }).catch(() => {});

  return NextResponse.json({
    ok: true,
    steps,
    message: "Écriture en base OK (données de test supprimées).",
  });
}
