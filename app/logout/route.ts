import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await destroySession();
  // Redirection relative (reste sur le domaine public derrière le proxy).
  return new NextResponse(null, { status: 303, headers: { Location: "/login" } });
}
