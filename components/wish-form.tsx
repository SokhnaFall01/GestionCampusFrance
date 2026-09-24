"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStudyWish, WishState } from "@/app/candidat/actions";

const initial: WishState = {};

export function WishForm({ sid }: { sid: string }) {
  const [state, formAction, pending] = useActionState(addStudyWish, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input type="hidden" name="_sid" value={sid} />
      {state.error && (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200">
          {state.error}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Domaine *</label>
          <input name="fieldOfStudy" className="input" placeholder="Informatique, Droit…" required />
        </div>
        <div>
          <label className="label">Formation visée *</label>
          <input name="formationName" className="input" placeholder="Master Génie logiciel…" required />
        </div>
        <div>
          <label className="label">Niveau</label>
          <input name="level" className="input" placeholder="Licence, Master…" />
        </div>
        <div>
          <label className="label">Établissement</label>
          <input name="establishment" className="input" placeholder="Université de…" />
        </div>
        <div>
          <label className="label">Ville</label>
          <input name="city" className="input" placeholder="Paris, Lyon…" />
        </div>
      </div>
      <div>
        <label className="label">Motivation (pourquoi ce choix)</label>
        <textarea name="motivation" className="input" rows={2} />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Ajout…" : "Ajouter ce vœu"}
      </button>
    </form>
  );
}
