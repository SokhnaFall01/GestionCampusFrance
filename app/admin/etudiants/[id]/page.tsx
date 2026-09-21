import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeProbability } from "@/lib/scoring";
import {
  FRENCH_LEVELS,
  SELECTIVITY_LABELS,
  SELECTIVITY_LEVELS,
  MENTIONS,
  MENTION_LABELS,
  type ProbabilityLevel,
} from "@/lib/constants";
import { StageBadge, ProbabilityBadge, DocStatusBadge, DecisionBadge } from "@/components/badges";
import {
  updateStage,
  saveNotes,
  addTask,
  toggleTask,
  deleteTask,
  reviewDocument,
  saveAssessment,
  setDecision,
  deleteStudent,
} from "../../actions";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default async function StudentDossier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, stages] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id },
      include: {
        user: true,
        assessment: true,
        stage: true,
        documents: {
          include: { documentType: true },
          orderBy: { documentType: { order: "asc" } },
        },
        tasks: { orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
        studyWishes: { orderBy: { createdAt: "desc" } },
        timeline: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
    prisma.stage.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!c) notFound();

  const a = c.assessment;
  const scoring = computeProbability({
    bacAverage: a?.bacAverage,
    postBacAverage: a?.postBacAverage,
    bacMention: a?.bacMention as never,
    frenchLevel: a?.frenchLevel as never,
    coherenceRating: a?.coherenceRating,
    selectivityLevel: a?.selectivityLevel as never,
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-primary">
          ← Tableau de bord
        </Link>
        <div className="card p-5 mt-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {c.firstName} {c.lastName}
              </h1>
              <div className="text-sm text-muted mt-1 space-x-3">
                <span>{c.user.email}</span>
                {c.phone && <span>· {c.phone}</span>}
                {c.city && <span>· {c.city}</span>}
              </div>
              <div className="text-sm text-muted mt-1">
                Niveau : {c.academicLevel || "—"} · Né(e) le {fmtDate(c.dateOfBirth)}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <StageBadge label={c.stage?.label} />
                <ProbabilityBadge
                  level={a?.probabilityLevel as ProbabilityLevel | null}
                  score={a?.score}
                />
                <DecisionBadge decision={a?.decision ?? "EN_ATTENTE"} />
              </div>
            </div>

            {/* Étape */}
            <form action={updateStage} className="flex items-end gap-2">
              <input type="hidden" name="candidateId" value={c.id} />
              <div>
                <label className="label">Étape actuelle</label>
                <select name="stageId" defaultValue={c.stageId ?? ""} className="input">
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-outline">Mettre à jour</button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vœux / projet d'études */}
          <Section title="Projet d'études (vœux du candidat)">
            {c.studyWishes.length === 0 ? (
              <p className="text-sm text-muted">
                Le candidat n'a pas encore renseigné ce qu'il souhaite suivre.
              </p>
            ) : (
              <ul className="space-y-3">
                {c.studyWishes.map((w) => (
                  <li key={w.id} className="rounded-lg ring-1 ring-border p-3">
                    <div className="font-semibold">{w.formationName}</div>
                    <div className="text-sm text-muted">
                      {w.fieldOfStudy}
                      {w.level ? ` · ${w.level}` : ""}
                      {w.establishment ? ` · ${w.establishment}` : ""}
                      {w.city ? ` · ${w.city}` : ""}
                    </div>
                    {w.motivation && <p className="text-sm mt-1">{w.motivation}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Documents */}
          <Section title="Documents du dossier">
            <div className="space-y-2">
              {c.documents.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg ring-1 ring-border p-3"
                >
                  <div>
                    <div className="font-medium text-sm">{d.documentType.label}</div>
                    <div className="text-xs text-muted">
                      {d.fileName ? (
                        <a
                          href={`/api/documents/${d.id}`}
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          📎 {d.fileName}
                        </a>
                      ) : (
                        "Non déposé"
                      )}
                      {d.reviewNote ? ` · ${d.reviewNote}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DocStatusBadge status={d.status} />
                    {d.status === "DEPOSE" && (
                      <div className="flex gap-1">
                        <form action={reviewDocument}>
                          <input type="hidden" name="candidateId" value={c.id} />
                          <input type="hidden" name="documentId" value={d.id} />
                          <input type="hidden" name="decision" value="VALIDE" />
                          <button className="btn btn-outline py-1 px-2 text-xs">✔ Valider</button>
                        </form>
                        <form action={reviewDocument}>
                          <input type="hidden" name="candidateId" value={c.id} />
                          <input type="hidden" name="documentId" value={d.id} />
                          <input type="hidden" name="decision" value="REFUSE" />
                          <button className="btn btn-outline py-1 px-2 text-xs">✖ Refuser</button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Actions / tâches */}
          <Section title="Actions à faire">
            <form action={addTask} className="flex flex-wrap gap-2 items-end mb-4">
              <input type="hidden" name="candidateId" value={c.id} />
              <div className="flex-1 min-w-[180px]">
                <label className="label">Nouvelle action</label>
                <input name="title" className="input" placeholder="Ex: Passer le TCF" required />
              </div>
              <div>
                <label className="label">Échéance</label>
                <input name="dueDate" type="date" className="input" />
              </div>
              <button className="btn btn-primary">Ajouter</button>
            </form>

            {c.tasks.length === 0 ? (
              <p className="text-sm text-muted">Aucune action pour l'instant.</p>
            ) : (
              <ul className="space-y-2">
                {c.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg ring-1 ring-border p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <form action={toggleTask}>
                        <input type="hidden" name="candidateId" value={c.id} />
                        <input type="hidden" name="taskId" value={t.id} />
                        <button
                          className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                            t.done ? "bg-green-600 text-white border-green-600" : "border-border"
                          }`}
                          title={t.done ? "Marquer non fait" : "Marquer fait"}
                        >
                          {t.done ? "✓" : ""}
                        </button>
                      </form>
                      <div>
                        <div className={`text-sm ${t.done ? "line-through text-muted" : ""}`}>
                          {t.title}
                        </div>
                        {t.dueDate && (
                          <div className="text-xs text-muted">Échéance : {fmtDate(t.dueDate)}</div>
                        )}
                      </div>
                    </div>
                    <form action={deleteTask}>
                      <input type="hidden" name="candidateId" value={c.id} />
                      <input type="hidden" name="taskId" value={t.id} />
                      <button className="text-muted hover:text-red-600 text-sm">Supprimer</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Suivi */}
          <Section title="Suivi du dossier">
            {c.timeline.length === 0 ? (
              <p className="text-sm text-muted">Aucun évènement.</p>
            ) : (
              <ul className="space-y-3">
                {c.timeline.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <div className="text-xs text-muted whitespace-nowrap pt-0.5 w-28">
                      {fmtDateTime(e.createdAt)}
                    </div>
                    <div>
                      {e.message}
                      <span className="text-xs text-muted ml-2">
                        ({e.author === "CANDIDATE" ? "candidat" : e.author === "ADMIN" ? "vous" : "système"})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Probabilité */}
          <Section title="Probabilité d'admission">
            {scoring.score !== null ? (
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{scoring.score}</span>
                  <span className="text-muted">/100</span>
                  <ProbabilityBadge level={scoring.level} />
                </div>
                {scoring.completeness < 100 && (
                  <p className="text-xs text-muted mt-1">
                    Estimation basée sur {scoring.completeness}% des critères renseignés.
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {scoring.criteria.map((cr) => (
                    <div key={cr.key}>
                      <div className="flex justify-between text-xs text-muted">
                        <span>
                          {cr.label} · {cr.weight}%
                        </span>
                        <span>{cr.subscore === null ? "—" : `${cr.subscore}/100`}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${cr.subscore ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted mb-4">
                Renseignez les critères ci-dessous pour calculer la probabilité.
              </p>
            )}

            <form action={saveAssessment} className="space-y-3 border-t border-border pt-4">
              <input type="hidden" name="candidateId" value={c.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Moyenne Bac /20</label>
                  <input
                    name="bacAverage"
                    className="input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    defaultValue={a?.bacAverage ?? ""}
                  />
                </div>
                <div>
                  <label className="label">Moyenne post-Bac /20</label>
                  <input
                    name="postBacAverage"
                    className="input"
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    defaultValue={a?.postBacAverage ?? ""}
                  />
                </div>
              </div>
              <div>
                <label className="label">Mention au Bac</label>
                <select name="bacMention" defaultValue={a?.bacMention ?? ""} className="input">
                  <option value="">—</option>
                  {MENTIONS.map((m) => (
                    <option key={m} value={m}>
                      {MENTION_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Niveau de français (TCF/DELF)</label>
                <select name="frenchLevel" defaultValue={a?.frenchLevel ?? ""} className="input">
                  <option value="">—</option>
                  {FRENCH_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Cohérence parcours ↔ formation (0-100)</label>
                <input
                  name="coherenceRating"
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={a?.coherenceRating ?? ""}
                />
              </div>
              <div>
                <label className="label">Sélectivité de la formation visée</label>
                <select
                  name="selectivityLevel"
                  defaultValue={a?.selectivityLevel ?? ""}
                  className="input"
                >
                  <option value="">—</option>
                  {SELECTIVITY_LEVELS.map((s) => (
                    <option key={s} value={s}>
                      {SELECTIVITY_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Commentaire</label>
                <textarea name="comment" className="input" rows={2} defaultValue={a?.comment ?? ""} />
              </div>
              <button className="btn btn-primary w-full">Calculer / Enregistrer</button>
            </form>
          </Section>

          {/* Décision */}
          <Section title="Décision d'acceptation">
            <p className="text-sm text-muted mb-3">
              Décision : <DecisionBadge decision={a?.decision ?? "EN_ATTENTE"} />
            </p>
            <div className="flex gap-2">
              <form action={setDecision}>
                <input type="hidden" name="candidateId" value={c.id} />
                <input type="hidden" name="decision" value="ACCEPTE" />
                <button className="btn btn-primary py-1.5">Accepter</button>
              </form>
              <form action={setDecision}>
                <input type="hidden" name="candidateId" value={c.id} />
                <input type="hidden" name="decision" value="REFUSE" />
                <button className="btn btn-outline py-1.5">Refuser</button>
              </form>
              <form action={setDecision}>
                <input type="hidden" name="candidateId" value={c.id} />
                <input type="hidden" name="decision" value="EN_ATTENTE" />
                <button className="btn btn-outline py-1.5">En attente</button>
              </form>
            </div>
          </Section>

          {/* Notes privées */}
          <Section title="Notes privées">
            <form action={saveNotes} className="space-y-2">
              <input type="hidden" name="candidateId" value={c.id} />
              <textarea
                name="notes"
                className="input"
                rows={4}
                placeholder="Notes visibles par vous uniquement…"
                defaultValue={c.notes ?? ""}
              />
              <button className="btn btn-outline w-full">Enregistrer</button>
            </form>
          </Section>

          {/* Zone danger */}
          <Section title="Zone de gestion">
            <form action={deleteStudent}>
              <input type="hidden" name="candidateId" value={c.id} />
              <button className="text-sm text-red-600 hover:underline">
                Supprimer cet étudiant et son dossier
              </button>
            </form>
          </Section>
        </div>
      </div>
    </div>
  );
}
