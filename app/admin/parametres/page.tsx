import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/auth";
import {
  addStage,
  renameStage,
  deleteStage,
  addDocumentType,
  renameDocumentType,
  deleteDocumentType,
} from "../actions";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-border font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default async function ParametresPage() {
  const [stages, docTypes, usageByStage] = await Promise.all([
    prisma.stage.findMany({ orderBy: { order: "asc" } }),
    prisma.documentType.findMany({ orderBy: { order: "asc" } }),
    prisma.candidate.groupBy({ by: ["stageId"], _count: true }),
  ]);

  const stageUsage = new Map(usageByStage.map((u) => [u.stageId, u._count]));
  const sid = (await getSessionId()) ?? "";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-primary">
          ← Tableau de bord
        </Link>
        <h1 className="text-xl font-bold mt-1">Paramètres</h1>
        <p className="text-sm text-muted mt-1">
          Personnalisez les étapes de la procédure et les documents demandés aux étudiants.
        </p>
      </div>

      {/* Étapes */}
      <Section title="Étapes de la procédure">
        <div className="space-y-2 mb-4">
          {stages.map((s) => {
            const used = stageUsage.get(s.id) ?? 0;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <form action={renameStage} className="flex items-center gap-2 flex-1">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="_sid" value={sid} />
                  <input name="label" defaultValue={s.label} className="input flex-1" />
                  <button className="btn btn-outline py-1.5 px-3 text-sm">Renommer</button>
                </form>
                <form action={deleteStage}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="_sid" value={sid} />
                  <button
                    className="text-sm text-muted hover:text-red-600 px-2"
                    title={used > 0 ? `${used} étudiant(s) à cette étape` : "Supprimer"}
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            );
          })}
          {stages.length === 0 && <p className="text-sm text-muted">Aucune étape.</p>}
        </div>

        <form action={addStage} className="flex items-end gap-2 border-t border-border pt-4">
          <input type="hidden" name="_sid" value={sid} />
          <div className="flex-1">
            <label className="label">Ajouter une étape</label>
            <input name="label" className="input" placeholder="Nom de la nouvelle étape" required />
          </div>
          <button className="btn btn-primary">Ajouter</button>
        </form>
        <p className="text-xs text-muted mt-2">
          Supprimer une étape ne supprime pas les étudiants : ils passent simplement à « aucune
          étape ».
        </p>
      </Section>

      {/* Documents */}
      <Section title="Documents demandés">
        <div className="space-y-2 mb-4">
          {docTypes.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <form action={renameDocumentType} className="flex items-center gap-2 flex-1">
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="_sid" value={sid} />
                <input name="label" defaultValue={d.label} className="input flex-1" />
                <button className="btn btn-outline py-1.5 px-3 text-sm">Renommer</button>
              </form>
              <form action={deleteDocumentType}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="_sid" value={sid} />
                <button className="text-sm text-muted hover:text-red-600 px-2">Supprimer</button>
              </form>
            </div>
          ))}
          {docTypes.length === 0 && <p className="text-sm text-muted">Aucun document.</p>}
        </div>

        <form
          action={addDocumentType}
          className="flex items-end gap-2 border-t border-border pt-4"
        >
          <input type="hidden" name="_sid" value={sid} />
          <div className="flex-1">
            <label className="label">Ajouter un document</label>
            <input
              name="label"
              className="input"
              placeholder="Nom de la pièce à demander"
              required
            />
          </div>
          <button className="btn btn-primary">Ajouter</button>
        </form>
        <p className="text-xs text-muted mt-2">
          Un nouveau document est automatiquement ajouté à la checklist de tous les étudiants.
          Le supprimer retire aussi les fichiers déjà déposés pour cette pièce.
        </p>
      </Section>
    </div>
  );
}
