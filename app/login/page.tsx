"use client";

import { useActionState } from "react";
import { loginAction, LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-primary">🇫🇷 Campus France</div>
          <p className="text-muted mt-1 text-sm">Gestion et suivi des dossiers étudiants</p>
        </div>

        <form action={formAction} className="card p-6 space-y-4">
          <h1 className="text-lg font-semibold">Connexion</h1>

          {state.error && (
            <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 ring-1 ring-red-200">
              {state.error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="vous@exemple.com"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="input"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-4">
          Espace réservé. Les comptes candidats sont créés par l'accompagnatrice.
        </p>
      </div>
    </main>
  );
}
