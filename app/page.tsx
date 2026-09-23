import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Redirection basée sur la session : toujours à jour, jamais en cache.
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role === "ADMIN" ? "/admin" : "/candidat");
}
