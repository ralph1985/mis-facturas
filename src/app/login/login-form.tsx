"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="accessCode">Código de acceso</label>
        <input
          id="accessCode"
          name="accessCode"
          type="password"
          autoComplete="current-password"
          required
          minLength={1}
          maxLength={1024}
          disabled={pending}
          placeholder="Introduce tu código"
        />
      </div>
      {state.error ? (
        <p className="action-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      ) : null}
      <button
        className="button button-primary"
        type="submit"
        disabled={pending}
      >
        {pending ? "Comprobando…" : "Entrar"}
      </button>
    </form>
  );
}
