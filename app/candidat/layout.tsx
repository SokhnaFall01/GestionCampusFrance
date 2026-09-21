import Link from "next/link";
import { requireCandidate } from "@/lib/auth";

export default async function CandidatLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireCandidate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/candidat" className="font-bold text-primary">
            🇫🇷 Mon espace Campus France
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted hidden sm:inline">{session.name}</span>
            <Link href="/logout" className="btn btn-outline py-1.5 px-3">
              Déconnexion
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
