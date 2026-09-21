import { prisma } from "@/lib/prisma";
import { requireCandidate } from "@/lib/auth";
import { StageBadge, DocStatusBadge } from "@/components/badges";
import { UploadForm } from "@/components/upload-form";
import { WishForm } from "@/components/wish-form";
import { deleteStudyWish } from "./actions";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-border font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default async function CandidatDashboard() {
  const { candidate } = await requireCandidate();
  const c = await prisma.candidate.findUnique({
    where: { id: candidate.id },
    include: {
      assessment: true,
      stage: true,
      documents: {
        include: { documentType: true },
        orderBy: { documentType: { order: "asc" } },
      },
      tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
      studyWishes: { orderBy: { createdAt: "desc" } },
      timeline: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!c) return null;

  const provided = c.documents.filter((d) => d.status !== "A_FOURNIR").length;
  const decision = c.assessment?.decision ?? "EN_ATTENTE";

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h1 className="text-xl font-bold">Bonjour {c.firstName} 👋</h1>
        <p className="text-sm text-muted mt-1">
          Voici l'avancement de votre dossier Campus France.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted">Étape :</span>
          <StageBadge label={c.stage?.label} />
        </div>
        {decision === "ACCEPTE" && (
          <div className="mt-3 rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2 ring-1 ring-green-200">
            🎉 Votre dossier a été accepté pour l'accompagnement.
          </div>
        )}
      </div>

      {/* Documents */}
      <Section title={`Mes documents (${provided}/${c.documents.length} déposés)`}>
        <div className="space-y-3">
          {c.documents.map((d) => {
            const locked = d.status === "VALIDE";
            return (
              <div key={d.id} className="rounded-lg ring-1 ring-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-sm">{d.documentType.label}</div>
                  <DocStatusBadge status={d.status} />
                </div>
                {d.fileName && (
                  <div className="text-xs text-muted mt-1">
                    <a
                      href={`/api/documents/${d.id}`}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      📎 {d.fileName}
                    </a>
                  </div>
                )}
                {d.status === "REFUSE" && d.reviewNote && (
                  <div className="text-xs text-red-600 mt-1">Motif : {d.reviewNote}</div>
                )}
                {!locked && <UploadForm documentId={d.id} label={d.documentType.label} />}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3">Formats acceptés : PDF ou image, 10 Mo maximum.</p>
      </Section>

      {/* Actions à faire */}
      <Section title="Ce que je dois faire">
        {c.tasks.length === 0 ? (
          <p className="text-sm text-muted">Aucune action demandée pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {c.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-4 h-4 rounded-full border flex-shrink-0 ${
                    t.done ? "bg-green-500 border-green-500" : "border-slate-300"
                  }`}
                />
                <span className={t.done ? "line-through text-muted" : ""}>{t.title}</span>
                {t.dueDate && !t.done && (
                  <span className="text-xs text-muted">· avant le {fmtDate(t.dueDate)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Vœux */}
      <Section title="Ce que je veux étudier (mes vœux)">
        {c.studyWishes.length > 0 && (
          <ul className="space-y-3 mb-4">
            {c.studyWishes.map((w) => (
              <li
                key={w.id}
                className="flex items-start justify-between gap-2 rounded-lg ring-1 ring-border p-3"
              >
                <div>
                  <div className="font-semibold text-sm">{w.formationName}</div>
                  <div className="text-xs text-muted">
                    {w.fieldOfStudy}
                    {w.level ? ` · ${w.level}` : ""}
                    {w.establishment ? ` · ${w.establishment}` : ""}
                    {w.city ? ` · ${w.city}` : ""}
                  </div>
                  {w.motivation && <p className="text-sm mt-1">{w.motivation}</p>}
                </div>
                <form action={deleteStudyWish}>
                  <input type="hidden" name="wishId" value={w.id} />
                  <button className="text-xs text-muted hover:text-red-600">Supprimer</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <WishForm />
      </Section>

      {/* Suivi */}
      <Section title="Historique">
        {c.timeline.length === 0 ? (
          <p className="text-sm text-muted">Aucun évènement.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {c.timeline.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="text-xs text-muted whitespace-nowrap w-24 pt-0.5">
                  {fmtDate(e.createdAt)}
                </span>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
