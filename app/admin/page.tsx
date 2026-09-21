import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MAX_CANDIDATES } from "@/lib/constants";
import { StageBadge, ProbabilityBadge, DecisionBadge } from "@/components/badges";
import type { ProbabilityLevel } from "@/lib/constants";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  const candidates = await prisma.candidate.findMany({
    include: { user: true, assessment: true, documents: true, tasks: true, stage: true },
    orderBy: { createdAt: "desc" },
  });

  const total = candidates.length;
  const accepted = candidates.filter((c) => c.assessment?.decision === "ACCEPTE").length;
  const toAssess = candidates.filter((c) => !c.assessment || c.assessment.score === null).length;
  const pendingTasks = candidates.reduce(
    (sum, c) => sum + c.tasks.filter((t) => !t.done).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <Link href="/admin/etudiants/nouveau" className="btn btn-primary">
          + Nouvel étudiant
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Étudiants suivis" value={`${total} / ${MAX_CANDIDATES}`} />
        <StatCard label="À évaluer" value={String(toAssess)} />
        <StatCard label="Dossiers acceptés" value={String(accepted)} />
        <StatCard label="Actions en attente" value={String(pendingTasks)} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold">Étudiants</div>

        {candidates.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Aucun étudiant pour le moment.
            <div className="mt-3">
              <Link href="/admin/etudiants/nouveau" className="btn btn-primary">
                Ajouter le premier étudiant
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-muted text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Étudiant</th>
                  <th className="px-4 py-2 font-medium">Étape</th>
                  <th className="px-4 py-2 font-medium">Documents</th>
                  <th className="px-4 py-2 font-medium">Probabilité</th>
                  <th className="px-4 py-2 font-medium">Décision</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const deposited = c.documents.filter((d) => d.status !== "A_FOURNIR").length;
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/etudiants/${c.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {c.firstName} {c.lastName}
                        </Link>
                        <div className="text-xs text-muted">{c.user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge label={c.stage?.label} />
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {deposited} / {c.documents.length}
                      </td>
                      <td className="px-4 py-3">
                        <ProbabilityBadge
                          level={c.assessment?.probabilityLevel as ProbabilityLevel | null}
                          score={c.assessment?.score}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <DecisionBadge decision={c.assessment?.decision ?? "EN_ATTENTE"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
