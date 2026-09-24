"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createStudent, CreateState } from "../../actions";

const initial: CreateState = {};

export function NewStudentForm({ sid }: { sid: string }) {
  const [state, formAction, pending] = useActionState(createStudent, initial);

  if (state.success) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-green-700">✅ Étudiant créé</h1>
          <p className="text-sm text-muted mt-1">
            Transmettez ces identifiants à l'étudiant pour qu'il accède à son espace candidat.
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 ring-1 ring-border p-4 space-y-2 text-sm">
            <div>
              <span className="text-muted">Email :</span>{" "}
              <span className="font-mono font-semibold">{state.success.email}</span>
            </div>
            <div>
              <span className="text-muted">Mot de passe :</span>{" "}
              <span className="font-mono font-semibold">{state.success.password}</span>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <Link href={`/admin/etudiants/${state.success.candidateId}`} className="btn btn-primary">
              Ouvrir le dossier
            </Link>
            <Link href="/admin/etudiants/nouveau" className="btn btn-outline">
              Ajouter un autre
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-muted hover:text-primary">
          ← Retour
        </Link>
        <h1 className="text-xl font-bold mt-1">Nouvel étudiant</h1>
      </div>

      <form action={formAction} className="card p-6 space-y-4">
        <input type="hidden" name="_sid" value={sid} />
        {state.error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom *</label>
            <input name="firstName" className="input" required />
          </div>
          <div>
            <label className="label">Nom *</label>
            <input name="lastName" className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" className="input" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Téléphone</label>
            <input name="phone" className="input" placeholder="+221…" />
          </div>
          <div>
            <label className="label">Ville</label>
            <input name="city" className="input" placeholder="Dakar" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date de naissance</label>
            <input name="dateOfBirth" type="date" className="input" />
          </div>
          <div>
            <label className="label">Niveau d'études actuel</label>
            <input name="academicLevel" className="input" placeholder="Terminale, Licence 2…" />
          </div>
        </div>

        <div>
          <label className="label">Mot de passe (laisser vide = généré automatiquement)</label>
          <input name="password" className="input" placeholder="généré si vide" />
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Création…" : "Créer l'étudiant"}
        </button>
      </form>
    </div>
  );
}
