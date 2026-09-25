import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSession } from "@/lib/auth";

// Diagnostic : indique si le cookie de session arrive au serveur (sur un GET)
// et si la session est reconnue.
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value ?? null;
  const allCookies = store.getAll().map((c) => c.name);
  const session = await getSession();
  return NextResponse.json({
    cookiePresent: Boolean(raw),
    cookieValueLength: raw ? raw.length : 0,
    allCookies,
    sessionSeen: Boolean(session),
    role: session?.role ?? null,
  });
}
