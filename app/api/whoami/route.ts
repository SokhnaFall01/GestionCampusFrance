import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

// Diagnostic session : indique si le cookie de session arrive au serveur,
// s'il est valide, et si le secret est bien configuré. Aucune donnée sensible.
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  const allCookieNames = store.getAll().map((c) => c.name);
  const hasSecret = Boolean(process.env.AUTH_SECRET);

  if (!raw) {
    return NextResponse.json({
      cookiePresent: false,
      allCookieNames,
      hasSecret,
      note: "Le cookie de session n'arrive pas au serveur.",
    });
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const { payload } = await jwtVerify(raw, secret);
    return NextResponse.json({
      cookiePresent: true,
      verified: true,
      hasSecret,
      role: payload.role,
      sub: payload.sub,
    });
  } catch (e) {
    return NextResponse.json({
      cookiePresent: true,
      verified: false,
      hasSecret,
      error: e instanceof Error ? e.message : String(e),
      tokenLength: raw.length,
    });
  }
}
