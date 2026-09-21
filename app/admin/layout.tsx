import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-primary">
              🇫🇷 Campus France
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/admin" className="hover:text-primary">
                Tableau de bord
              </Link>
              <Link href="/admin/etudiants/nouveau" className="hover:text-primary">
                + Nouvel étudiant
              </Link>
              <Link href="/admin/parametres" className="hover:text-primary">
                Paramètres
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted hidden sm:inline">{session.name}</span>
            <Link href="/logout" className="btn btn-outline py-1.5 px-3">
              Déconnexion
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
