import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, MailCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button, ButtonLink } from "@/components/ui/button";
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
        <div className="flex flex-col gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-weak text-success">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <p className="text-body text-ink-secondary" role="status">
            Se houver uma conta em{" "}
            <strong className="text-ink-primary">{email}</strong>, o link de
            redefinição chega em instantes. Ele vale por 30 minutos.
          </p>
          <p className="text-label text-ink-tertiary">
            Não chegou? Confira a caixa de spam ou peça outro link.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <ButtonLink to="/entrar">Voltar ao login</ButtonLink>
            <Button variant="secondary" onClick={() => request.reset()}>
              Pedir outro link
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const error = request.isError
    ? request.error instanceof ApiError
      ? request.error.statusCode === 429
        ? "Muitos pedidos seguidos. Aguarde um minuto e tente de novo."
        : request.error.message
      : "Não foi possível enviar. Verifique a conexão e tente de novo."
    : undefined;

  return (
    <AuthLayout
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova."
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
          inputMode="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
        />

        <Button type="submit" block size="lg" loading={request.isPending}>
          Enviar link
        </Button>

        <Link
          to="/entrar"
          className="inline-flex items-center gap-1 self-center rounded-marker text-label font-semibold text-accent-ink hover:underline pointer-coarse:py-2"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar ao login
        </Link>
      </form>
    </AuthLayout>
  );
}
