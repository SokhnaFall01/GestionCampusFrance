import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Non autorisé", { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { candidate: true },
  });
  if (!doc || !doc.storedName) return new NextResponse("Introuvable", { status: 404 });

  // Un candidat ne peut lire que ses propres documents.
  if (session.role !== "ADMIN" && doc.candidate.userId !== session.sub) {
    return new NextResponse("Interdit", { status: 403 });
  }

  try {
    const buffer = await readUpload(doc.candidateId, doc.storedName);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName || "document")}"`,
      },
    });
  } catch {
    return new NextResponse("Fichier introuvable", { status: 404 });
  }
}
