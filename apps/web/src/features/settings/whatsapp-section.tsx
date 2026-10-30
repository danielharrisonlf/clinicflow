import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  controlClass,
  describedBy,
  FieldShell,
  Switch,
} from "@/components/ui/field";
import { ErrorState, TextSkeleton } from "@/components/ui/states";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";
import { settingsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

const TEMPLATE_MAX = 1000;

/**
 * Marcadores que o backend troca no envio, com o valor de exemplo da prévia.
 * O exemplo segue o formato real: só o primeiro nome do paciente, data por extenso.
 */
const PLACEHOLDERS = [
  { token: "{{paciente}}", label: "Paciente", sample: "Maria" },
  {
    token: "{{profissional}}",
    label: "Profissional",
    sample: "Dra. Helena Prado",
  },
  { token: "{{data}}", label: "Data", sample: "15 de outubro" },
  { token: "{{hora}}", label: "Hora", sample: "09:30" },
] as const;

const KNOWN = new Set<string>(PLACEHOLDERS.map((p) => p.token));

/** O backend usa `String.replace` com texto: só a primeira ocorrência é trocada. A prévia imita. */
function preview(template: string): string {
  let out = template;
  for (const p of PLACEHOLDERS) out = out.replace(p.token, p.sample);
  return out;
}

export function WhatsappSection({
  leadHours,
  editable = true,
}: {
  leadHours?: number;
  editable?: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templateId = useId();

  const whatsapp = useQuery({
    queryKey: qk.settings.whatsapp,
    queryFn: settingsApi.whatsapp,
  });

  const [draft, setDraft] = useState<{ enabled?: boolean; template?: string }>(
    {},
  );
  const data = whatsapp.data;
  const enabled = draft.enabled ?? data?.whatsappEnabled ?? false;
  const template = draft.template ?? data?.whatsappTemplate ?? "";
  const dirty =
    data !== undefined &&
    (enabled !== data.whatsappEnabled || template !== data.whatsappTemplate);

  const tokens: string[] = template.match(/\{\{[^}]*\}\}/g) ?? [];
  const unknown = [...new Set(tokens.filter((token) => !KNOWN.has(token)))];
  const repeated = [
    ...new Set(
      tokens.filter(
        (token, index) => KNOWN.has(token) && tokens.indexOf(token) !== index,
      ),
    ),
  ];
  const templateError =
    enabled && template.trim() === ""
      ? "Escreva a mensagem antes de ligar o envio automático."
      : template.length > TEMPLATE_MAX
        ? `A mensagem passou de ${TEMPLATE_MAX} caracteres.`
        : undefined;

  const save = useMutation({
    mutationFn: () =>
      settingsApi.updateWhatsapp({
        whatsappEnabled: enabled,
        whatsappTemplate: template,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.settings.whatsapp, saved);
      setDraft({});
      toast.push({
        tone:
          saved.whatsappEnabled && saved.transport === "log"
            ? "warning"
            : "success",
        title: saved.whatsappEnabled
          ? saved.transport === "log"
            ? "Simulação automática ligada"
            : "Confirmação automática ligada"
          : "Confirmação automática salva",
        description: saved.whatsappEnabled
          ? saved.transport === "log"
            ? "As mensagens são simuladas e não chegam aos pacientes."
            : "Mensagem salva. O envio depende do provedor configurado."
          : "O envio automático está desligado.",
      });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "A mensagem não foi salva",
        description: errorMessage(error),
      }),
  });

  /** Insere o marcador onde o cursor está — não no fim do texto. */
  function insert(token: string) {
    const element = textareaRef.current;
    const start = element?.selectionStart ?? template.length;
    const end = element?.selectionEnd ?? template.length;
    const next = template.slice(0, start) + token + template.slice(end);
    setDraft((current) => ({ ...current, template: next }));
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      const caret = start + token.length;
      element.setSelectionRange(caret, caret);
    });
  }

  return (
    <Panel aria-labelledby="secao-whatsapp">
      <PanelHeader
        id="secao-whatsapp"
        title="Confirmação por WhatsApp"
        description="Mensagem para solicitar a confirmação da consulta."
        actions={
          editable ? null : (
            <span className="inline-flex items-center gap-1 text-label text-ink-secondary">
              <Lock className="size-3.5" aria-hidden="true" />
              Só a gestão altera
            </span>
          )
        }
      />

      {whatsapp.isPending ? (
        <PanelBody>
          <TextSkeleton lines={4} />
        </PanelBody>
      ) : whatsapp.isError && !data ? (
        <ErrorState
          compact
          title="As configurações do WhatsApp não carregaram"
          error={whatsapp.error}
          onRetry={() => void whatsapp.refetch()}
        />
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!editable || !dirty || templateError) return;
            save.mutate();
          }}
        >
          <PanelBody className="flex flex-col gap-5">
            {data?.transport === "log" ? (
              <Callout tone="warning" title="Modo de teste">
                As mensagens são simuladas neste ambiente e não chegam aos
                pacientes.
              </Callout>
            ) : null}

            <Switch
              label="Enviar confirmação automática"
              description={
                leadHours !== undefined
                  ? `Sai ${leadHours} h antes de cada consulta agendada.`
                  : "Sai antes de cada consulta agendada, no prazo da antecedência de confirmação."
              }
              checked={enabled}
              disabled={!editable}
              onChange={(next) =>
                setDraft((current) => ({ ...current, enabled: next }))
              }
            />

            <FieldShell
              id={templateId}
              label="Mensagem"
              error={templateError}
              hint={`${template.length}/${TEMPLATE_MAX} caracteres`}
            >
              <fieldset className="flex flex-wrap gap-1.5">
                <legend className="sr-only">
                  Inserir marcador na mensagem
                </legend>
                {editable
                  ? PLACEHOLDERS.map((p) => (
                      <Button
                        key={p.token}
                        variant="secondary"
                        size="sm"
                        onClick={() => insert(p.token)}
                        aria-label={`Inserir ${p.label.toLowerCase()} (${p.token})`}
                        className="font-mono"
                      >
                        <Plus aria-hidden="true" />
                        {p.token}
                      </Button>
                    ))
                  : null}
              </fieldset>
              <textarea
                ref={textareaRef}
                id={templateId}
                rows={4}
                value={template}
                readOnly={!editable}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    template: event.target.value,
                  }))
                }
                aria-invalid={templateError ? true : undefined}
                aria-describedby={describedBy(templateId, templateError, true)}
                className={cn(
                  controlClass,
                  templateError
                    ? "border-danger hover:border-danger focus-visible:border-danger"
                    : "border-border-strong",
                  "min-h-28 resize-y px-3 py-2.5",
                )}
              />
            </FieldShell>

            {unknown.length > 0 ? (
              <Callout tone="warning" title="Marcador desconhecido">
                {unknown.join(", ")} não é trocado no envio e chega ao paciente
                como está. Use os botões acima.
              </Callout>
            ) : null}
            {repeated.length > 0 ? (
              <p className="text-label text-ink-secondary">
                {repeated.join(", ")} aparece mais de uma vez: só o primeiro é
                trocado no envio.
              </p>
            ) : null}

            <section
              aria-labelledby="previa-whatsapp"
              className="flex flex-col gap-1.5"
            >
              <h3
                id="previa-whatsapp"
                className="text-label font-semibold text-ink-secondary"
              >
                Prévia com dados de exemplo
              </h3>
              <p className="whitespace-pre-wrap rounded-raised bg-surface-sunken px-3.5 py-3 text-body text-ink-primary">
                {template.trim() ? (
                  preview(template)
                ) : (
                  <span className="text-ink-tertiary">
                    A mensagem aparece aqui.
                  </span>
                )}
              </p>
              <p className="text-micro text-ink-tertiary">
                Paciente, profissional, data e hora reais entram no lugar dos
                exemplos.
              </p>
            </section>
          </PanelBody>

          {editable ? (
            <div className="flex flex-col-reverse gap-2 border-t border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-end md:px-5">
              <p
                className="text-label text-ink-secondary sm:mr-auto"
                aria-live="polite"
              >
                {dirty ? "Alterações não salvas" : "Tudo salvo"}
              </p>
              {dirty ? (
                <Button
                  variant="ghost"
                  disabled={save.isPending}
                  onClick={() => setDraft({})}
                >
                  Descartar
                </Button>
              ) : null}
              <Button type="submit" loading={save.isPending} disabled={!dirty}>
                Salvar mensagem
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </Panel>
  );
}
