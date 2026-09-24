"use client";

import { useActionState } from "react";
import { uploadDocument, UploadState } from "@/app/candidat/actions";

const initial: UploadState = {};

export function UploadForm({
  documentId,
  label,
  sid,
}: {
  documentId: string;
  label: string;
  sid: string;
}) {
  const [state, formAction, pending] = useActionState(uploadDocument, initial);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 mt-2">
      <input type="hidden" name="_sid" value={sid} />
      <input type="hidden" name="documentId" value={documentId} />
      <input
        type="file"
        name="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
        className="text-xs"
        aria-label={`Fichier pour ${label}`}
        required
      />
      <button className="btn btn-outline py-1 px-2 text-xs" disabled={pending}>
        {pending ? "Envoi…" : "Déposer"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.ok && <span className="text-xs text-green-600">Envoyé ✓</span>}
    </form>
  );
}
