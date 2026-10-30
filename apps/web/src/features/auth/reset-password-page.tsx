import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PasswordField } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useAuth } from "./auth-context";
import { AuthLayout } from "./auth-layout";

const MIN_LENGTH = 8;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { status, logout } = useAuth();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmation?: string;
  }>({});

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: async () => {
      // O backend encerra todas as sessões: a local também precisa cair.
      if (status === "authenticated") await logout();
      navigate("/entrar", {
        replace: true,
        state: { notice: "Senha alterada. Entre com a senha nova." },
      });
    },
  });

  if (!token) {
    return (
      <AuthLayout
        title="Link inválido"
        description="Este endereço não traz um código de redefinição. Os links valem por 30 minutos e só funcionam uma vez."
      >
        <ButtonLink to="/recuperar-senha" block size="lg">
          Pedir novo link
        </ButtonLink>
      </AuthLayout>
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (password.length < MIN_LENGTH)
      next.password = `Use pelo menos ${MIN_LENGTH} caracteres.`;
    else if (password !== confirmation)
      next.confirmation = "As duas senhas estão diferentes.";
    setErrors(next);
    if (Object.keys(next).length === 0) reset.mutate();
  }

  const serverError = reset.isError
    ? reset.error instanceof ApiError
      ? reset.error.code === "RESET_TOKEN_INVALID"
        ? "Este link expirou ou já foi usado. Peça um novo."
        : reset.error.message
      : "Não foi possível trocar a senha. Verifique a conexão e tente de novo."
    : null;

  return (
    <AuthLayout
      title="Nova senha"
      description="Ao salvar, as sessões abertas nesta conta são encerradas."
    >
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {serverError ? (
          <Callout
            tone="danger"
            live
            action={
              reset.error instanceof ApiError &&
              reset.error.code === "RESET_TOKEN_INVALID" ? (
                <ButtonLink to="/recuperar-senha" variant="secondary" size="sm">
                  Pedir novo link
                </ButtonLink>
              ) : undefined
            }
          >
            {serverError}
          </Callout>
        ) : null}
        <PasswordField
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`Mínimo de ${MIN_LENGTH} caracteres.`}
          error={errors.password}
        />
        <PasswordField
          label="Repita a senha"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={errors.confirmation}
        />

        <Button type="submit" block size="lg" loading={reset.isPending}>
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
