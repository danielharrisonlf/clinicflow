import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { ErrorState, InlineError, TextSkeleton } from "@/components/ui/states";
import {
  DescriptionList,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/ui/surface";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError, errorMessage } from "@/lib/api/client";
import { settingsApi } from "@/lib/api/endpoints";
import type { Settings, UpdateSettingsInput } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { WhatsappSection } from "./whatsapp-section";

type OperationKey = keyof Required<UpdateSettingsInput>;

/** Limites do `UpdateSettingsDto`. Repetidos aqui para barrar antes do envio. */
const OPERATION_FIELDS: {
  key: OperationKey;
  label: string;
  suffix: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  {
    key: "defaultDurationMinutes",
    label: "Duração padrão da consulta",
    suffix: "min",
    hint: "Usada quando o profissional não tem duração própria.",
    min: 5,
    max: 480,
  },
  {
    key: "confirmationLeadHours",
    label: "Antecedência da confirmação",
    suffix: "h",
    hint: "Quantas horas antes da consulta o pedido de confirmação sai.",
    min: 1,
    max: 240,
  },
  {
    key: "returnWindowDays",
    label: "Janela de retorno",
    suffix: "dias",
    hint: "Prazo da pendência de retorno criada ao concluir uma consulta.",
    min: 1,
    max: 365,
  },
  {
    key: "lateToleranceMinutes",
    label: "Tolerância de atraso",
    suffix: "min",
    hint: "Depois disso, a consulta não atendida aparece como atrasada.",
    min: 0,
    max: 120,
  },
];

export function SettingsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "GESTOR";

  const settings = useQuery({
    queryKey: qk.settings.general,
    queryFn: settingsApi.get,
  });

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <PageHeader
        title="Configurações"
        description="Regras de funcionamento da clínica e preferências deste aparelho."
        className="mb-0 md:mb-0"
      />

      {!isManager ? (
        <Callout tone="info" title="Somente leitura">
          Alterar as regras da clínica exige o perfil de gestão. Se algo precisa
          mudar, fale com a gestão.
        </Callout>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
        <nav
          aria-label="Seções das configurações"
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <p className="mb-2 text-label font-semibold text-ink-secondary">
            Nesta página
          </p>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {[
              ["secao-clinica", "Clínica"],
              ["secao-operacao", "Regras de atendimento"],
              ["secao-whatsapp", "WhatsApp"],
              ["secao-aparencia", "Aparência"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex shrink-0 items-center rounded-control px-3 py-2 pointer-coarse:min-h-11 text-label font-medium text-ink-secondary hover:bg-surface-hover hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-accent-ink lg:w-full"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
        <div className="flex min-w-0 flex-col gap-5">
          {settings.isError && !settings.data ? (
            <Panel>
              <ErrorState
                title="As configurações não carregaram"
                error={settings.error}
                onRetry={() => void settings.refetch()}
              />
            </Panel>
          ) : (
            <>
              <Panel aria-labelledby="secao-clinica">
                <PanelHeader
                  id="secao-clinica"
                  title="Clínica"
                  description="Nome exibido na navegação e fuso usado nos horários da agenda."
                />
                <PanelBody>
                  {settings.data ? (
                    <DescriptionList
                      items={[
                        { label: "Nome", value: settings.data.clinicName },
                        {
                          label: "Fuso horário",
                          value: (
                            <span className="font-mono tabular-nums">
                              {settings.data.timezone}
                            </span>
                          ),
                        },
                      ]}
                    />
                  ) : (
                    <TextSkeleton lines={2} />
                  )}
                  <Link
                    to="/profissionais"
                    className="mt-4 inline-flex items-center gap-1 rounded-marker text-label font-semibold text-accent-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent-ink"
                  >
                    Gerenciar horários dos profissionais
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </PanelBody>
              </Panel>

              <OperationSection settings={settings.data} editable={isManager} />

              <WhatsappSection
                leadHours={settings.data?.confirmationLeadHours}
                editable={isManager}
              />
            </>
          )}

          <Panel aria-labelledby="secao-aparencia">
            <PanelHeader
              id="secao-aparencia"
              title="Aparência"
              description="Vale só para este navegador. “Sistema” segue o tema do aparelho."
            />
            <PanelBody className="max-w-sm">
              <ThemeToggle />
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/**
 * Erro do campo, ou nada. Campo vazio é erro, não zero: `Number("")` é 0 e
 * salvaria "tolerância 0" sem ninguém ter pedido.
 */
function fieldError(
  raw: string,
  field: (typeof OPERATION_FIELDS)[number],
): string | undefined {
  const range = `entre ${field.min} e ${field.max} ${field.suffix}`;
  if (raw.trim() === "") return `Informe um valor ${range}.`;
  const value = Number(raw);
  if (!Number.isInteger(value)) return `Use um número inteiro ${range}.`;
  if (value < field.min || value > field.max)
    return `O valor precisa ficar ${range}.`;
  return undefined;
}

function OperationSection({
  settings,
  editable,
}: {
  settings?: Settings;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  // Só o que a pessoa mexeu. O resto lê direto do servidor: sem semear estado
  // com a resposta, nada sobrescreve o que já foi digitado num refetch.
  const [draft, setDraft] = useState<Partial<Record<OperationKey, string>>>({});
  const [touched, setTouched] = useState(false);

  const currentValue = (key: OperationKey) =>
    draft[key] ?? (settings ? String(settings[key]) : "");

  const changed = OPERATION_FIELDS.filter(
    (field) =>
      settings !== undefined &&
      draft[field.key] !== undefined &&
      draft[field.key] !== String(settings[field.key]),
  );
  const dirty = changed.length > 0;
  const errors = Object.fromEntries(
    OPERATION_FIELDS.map((field) => [
      field.key,
      fieldError(currentValue(field.key), field),
    ]),
  ) as Record<OperationKey, string | undefined>;
  const invalid = OPERATION_FIELDS.some((field) => errors[field.key]);

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateSettingsInput = {};
      for (const field of changed)
        body[field.key] = Number(currentValue(field.key));
      return settingsApi.update(body);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.settings.general, saved);
      for (const queryKey of [
        qk.settings.all,
        qk.appointments.all,
        qk.dashboard.all,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      setDraft({});
      setTouched(false);
      toast.push({
        tone: "success",
        title: "Regras de operação salvas",
        description: "Agenda e painel já usam os novos valores.",
      });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "As regras não foram salvas",
        description: errorMessage(error),
      }),
  });

  const serverErrors =
    save.error instanceof ApiError ? save.error.fieldErrors() : {};

  return (
    <Panel aria-labelledby="secao-operacao">
      <PanelHeader
        id="secao-operacao"
        title="Regras de atendimento"
        description="Valores padrão da clínica. A grade de horários de cada profissional fica no cadastro de profissionais."
        actions={
          editable ? null : (
            <span className="inline-flex items-center gap-1 text-label text-ink-secondary">
              <Lock className="size-3.5" aria-hidden="true" />
              Só a gestão altera
            </span>
          )
        }
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (!dirty || invalid) return;
          save.mutate();
        }}
      >
        <PanelBody>
          {settings ? (
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              {OPERATION_FIELDS.map((field) => {
                const own = draft[field.key] !== undefined || touched;
                return (
                  <Field
                    key={field.key}
                    label={field.label}
                    type="number"
                    inputMode="numeric"
                    min={field.min}
                    max={field.max}
                    step={1}
                    suffix={field.suffix}
                    readOnly={!editable}
                    value={currentValue(field.key)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    hint={field.hint}
                    error={
                      editable && own
                        ? (errors[field.key] ?? serverErrors[field.key])
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {OPERATION_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ))}
            </div>
          )}
        </PanelBody>
        {editable && settings ? (
          <div className="flex flex-col-reverse gap-2 border-t border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-end md:px-5">
            <p
              className="text-label text-ink-secondary sm:mr-auto"
              aria-live="polite"
            >
              {dirty
                ? changed.length === 1
                  ? "1 alteração não salva"
                  : `${changed.length} alterações não salvas`
                : "Tudo salvo"}
            </p>
            {dirty ? (
              <Button
                variant="ghost"
                disabled={save.isPending}
                onClick={() => {
                  setDraft({});
                  setTouched(false);
                  save.reset();
                }}
              >
                Descartar
              </Button>
            ) : null}
            <Button type="submit" loading={save.isPending} disabled={!dirty}>
              Salvar
            </Button>
          </div>
        ) : null}
        {editable && save.isError && Object.keys(serverErrors).length === 0 ? (
          <div className="px-4 pb-4 md:px-5">
            <InlineError
              error={save.error}
              label="O servidor recusou as alterações."
            />
          </div>
        ) : null}
      </form>
    </Panel>
  );
}
