import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { AuthLayout } from "./auth-layout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const request = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
  });

  // A resposta é a mesma exista ou não a conta. Dizer "e-mail não encontrado"
  // aqui entrega quem trabalha na clínica para quem estiver testando endereços.
  if (request.isSuccess) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <p className="text-body text-ink-secondary">
          Se houver uma conta em{" "}
          <strong className="text-ink-primary">{email}</strong>, o link de
          redefinição chega em instantes. Ele vale por 30 minutos.
        </p>
        <p className="mt-3 text-micro text-ink-tertiary">
          Não chegou? Confira a caixa de spam ou peça outro link.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => request.reset()}>
            Pedir outro
          </Button>
          <Link
            to="/entrar"
            className="flex h-10 items-center px-3 text-micro font-semibold text-accent hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      description="Informe o e-mail da sua conta e enviamos um link para você criar uma senha nova."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          request.mutate();
        }}
      >
        <Field
          label="E-mail"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={
            request.isError
              ? request.error instanceof ApiError
                ? request.error.message
                : "Não foi possível enviar. Tente de novo."
              : undefined
          }
        />

        <Button type="submit" block size="lg" loading={request.isPending}>
          Enviar link
        </Button>

        <Link
          to="/entrar"
          className="self-center text-micro font-semibold text-accent hover:underline"
        >
          Voltar ao login
        </Link>
      </form>
    </AuthLayout>
  );
}
