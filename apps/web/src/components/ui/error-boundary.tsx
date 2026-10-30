import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Rede de proteção de renderização. Sem ela, um campo nulo inesperado num DTO
 * deixava a recepção olhando uma tela branca. Com ela, só a área quebrada cai,
 * com saída: recarregar a área ou voltar para o painel.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[ClinicFlow] erro de renderização",
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(previous: { resetKey?: string }) {
    // Trocar de rota limpa o erro: a próxima tela não herda a quebra da anterior.
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center"
      >
        <p className="text-section font-semibold text-ink-primary">
          Esta tela encontrou um problema
        </p>
        <p className="text-body text-ink-secondary">
          Nada foi perdido. Recarregue a tela; se continuar, volte ao painel e
          avise o suporte.
        </p>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => this.setState({ error: null })}>
            Recarregar tela
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.assign("/");
            }}
          >
            Ir para o painel
          </Button>
        </div>
      </div>
    );
  }
}
