import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, PasswordField } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "./auth-context";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.statusCode === 429
            ? "Muitas tentativas seguidas. Aguarde um minuto e tente de novo."
            : cause.message
          : "Não foi possível entrar. Verifique a conexão da recepção.",
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Use o e-mail e a senha da sua conta na clínica."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {notice ? (
          <Callout tone="success" live>
            {notice}
          </Callout>
        ) : null}
        {error ? (
          <Callout tone="danger" live>
            {error}
          </Callout>
        ) : null}

        <Field
          label="E-mail"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          value={email}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <PasswordField
            label="Senha"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Link
            to="/recuperar-senha"
            className="self-end rounded-marker text-label font-semibold text-accent-ink hover:underline pointer-coarse:py-2"
          >
            Esqueci minha senha
          </Link>
        </div>

        <Button
          type="submit"
          block
          loading={submitting}
          size="lg"
          className="mt-1"
        >
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
