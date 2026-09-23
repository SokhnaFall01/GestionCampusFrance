import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, getSession } from "@/lib/auth";

// Diagnostic : lit la session dans le contexte d'une PAGE (comme /admin),
// pour comparer avec la route /api/whoami.
export const dynamic = "force-dynamic";

export default async function SessionCheck() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  const names = store.getAll().map((c) => c.name);

  let verified = false;
  let err: string | null = null;
  if (raw) {
    try {
      await jwtVerify(raw, new TextEncoder().encode(process.env.AUTH_SECRET || ""));
      verified = true;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
  }

  const session = await getSession();

  const result = {
    contexte: "page (comme /admin)",
    cookiePresent: Boolean(raw),
    cookieNames: names,
    verified,
    getSessionVue: Boolean(session),
    role: session?.role ?? null,
    err,
  };

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </main>
  );
}
