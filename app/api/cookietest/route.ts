import { NextResponse } from "next/server";

// Diagnostic cookies : pose deux cookies (un simple, un « secure ») puis
// redirige vers /api/whoami pour voir lesquels reviennent.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/api/whoami", request.url), 303);
  // Cookie simple (sans secure, non httpOnly)
  res.cookies.set("testplain", "1", { path: "/", sameSite: "lax" });
  // Cookie « secure » (comme le cookie de session)
  res.cookies.set("testsecure", "1", { path: "/", sameSite: "lax", secure: true, httpOnly: true });
  return res;
}
