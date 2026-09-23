import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Diagnostic temporaire : indique si la session est vue côté serveur ET teste
// l'écriture en base (création compte → fiche → documents), puis nettoie.
// À retirer une fois le problème résolu.
export const dynamic = "force-dynamic";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function GET() {
  const session = await getSession();
  const sessionInfo = {
    sessionSeen: Boolean(session),
    role: session?.role ?? null,
    email: session?.email ?? null,
  };

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
    return NextResponse.json({ ok: false, ...sessionInfo, failedAt: "création compte", error: msg(e), steps });
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
    return NextResponse.json({ ok: false, ...sessionInfo, failedAt: "création fiche", error: msg(e), steps });
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
    return NextResponse.json({ ok: false, ...sessionInfo, failedAt: "création documents", error: msg(e), steps });
  }

  await prisma.user.delete({ where: { id: userId! } }).catch(() => {});

  return NextResponse.json({
    ok: true,
    ...sessionInfo,
    steps,
    message: "Écriture en base OK (données de test supprimées).",
  });
}
