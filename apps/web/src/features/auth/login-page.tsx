import { useState } from "react";
import { Link, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "./auth-context";
import { AuthLayout } from "./auth-layout";

export function LoginPage() {
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") return <Navigate to="/" replace />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível entrar. Verifique a conexão da recepção.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Entrar">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="E-mail"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <PasswordField
          label="Senha"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error ?? undefined}
        />

        <Button type="submit" block loading={submitting} size="lg">
          Entrar
        </Button>

        <Link
          to="/recuperar-senha"
          className="self-center text-micro font-semibold text-accent hover:underline"
        >
          Esqueci minha senha
        </Link>
      </form>
    </AuthLayout>
  );
}
