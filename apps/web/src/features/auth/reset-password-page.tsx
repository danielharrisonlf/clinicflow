import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { AuthLayout } from "./auth-layout";

const MIN_LENGTH = 8;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: () => navigate("/entrar", { replace: true }),
  });

  if (!token) {
    return (
      <AuthLayout title="Link inválido">
        <p className="text-body text-ink-secondary">
          Este endereço não traz um token de redefinição. Peça um link novo.
        </p>
        <Link
          to="/recuperar-senha"
          className="mt-4 inline-block text-micro font-semibold text-accent hover:underline"
        >
          Pedir novo link
        </Link>
      </AuthLayout>
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < MIN_LENGTH) {
      setLocalError(`Use pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setLocalError("As duas senhas estão diferentes.");
      return;
    }
    setLocalError(null);
    reset.mutate();
  }

  const serverError =
    reset.isError && reset.error instanceof ApiError
      ? reset.error.message
      : reset.isError
        ? "Não foi possível trocar a senha. Tente de novo."
        : null;

  return (
    <AuthLayout
      title="Nova senha"
      description="Ao salvar, as sessões abertas nesta conta são encerradas."
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <PasswordField
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`Mínimo de ${MIN_LENGTH} caracteres.`}
          error={serverError ?? undefined}
        />
        <PasswordField
          label="Repita a senha"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={localError ?? undefined}
        />

        <Button type="submit" block size="lg" loading={reset.isPending}>
          Salvar e entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
