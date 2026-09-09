import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { ErrorState } from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { settingsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";

/** Limites do `UpdateSettingsDto`. Repetidos aqui para o input barrar antes do POST. */
const BOUNDS = {
  defaultDurationMinutes: { min: 5, max: 480 },
  confirmationLeadHours: { min: 1, max: 240 },
  returnWindowDays: { min: 1, max: 365 },
  lateToleranceMinutes: { min: 0, max: 120 },
} as const;

export function SettingsPage() {
  const { user } = useAuth();
  const isManager = user?.role === "GESTOR";

  const settings = useQuery({
    queryKey: qk.settings,
    queryFn: settingsApi.get,
  });

  if (settings.isError) {
    return (
      <ErrorState
        error={settings.error}
        onRetry={() => void settings.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header>
        <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
          Configurações
        </h1>
        {!isManager ? (
          <p className="mt-0.5 text-body text-ink-secondary">
            Somente leitura. Alterar exige perfil de gestão.
          </p>
        ) : null}
      </header>

      <Panel>
        <PanelHeader title="Clínica" />
        <dl className="divide-y divide-border-subtle">
          <ReadOnlyRow term="Nome" value={settings.data?.clinicName} />
          <ReadOnlyRow
            term="Fuso horário"
            value={settings.data?.timezone}
            mono
          />
        </dl>
      </Panel>

      <OperationForm
        settings={settings.data}
        loading={settings.isPending}
        editable={isManager}
      />

      {isManager ? <WhatsappForm /> : null}
    </div>
  );
}

function ReadOnlyRow({
  term,
  value,
  mono,
}: {
  term: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-4 px-4 py-3">
      <dt className="min-w-40 text-body font-semibold text-ink-primary">
        {term}
      </dt>
      <dd className={`text-body text-ink-secondary ${mono ? "font-mono" : ""}`}>
        {value ?? (
          <span className="skeleton inline-block h-4 w-32 align-middle" />
        )}
      </dd>
    </div>
  );
}

type OperationValues = {
  defaultDurationMinutes: string;
  confirmationLeadHours: string;
  returnWindowDays: string;
  lateToleranceMinutes: string;
};

function OperationForm({
  settings,
  loading,
  editable,
}: {
  settings?: {
    defaultDurationMinutes: number;
    confirmationLeadHours: number;
    returnWindowDays: number;
    lateToleranceMinutes: number;
  };
  loading: boolean;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState<OperationValues | null>(null);

  // O formulário só é semeado quando a resposta chega. Semear com string vazia
  // e sobrescrever depois apagaria o que a pessoa já tivesse digitado.
  useEffect(() => {
    if (!settings || values) return;
    setValues({
      defaultDurationMinutes: String(settings.defaultDurationMinutes),
      confirmationLeadHours: String(settings.confirmationLeadHours),
      returnWindowDays: String(settings.returnWindowDays),
      lateToleranceMinutes: String(settings.lateToleranceMinutes),
    });
  }, [settings, values]);

  const save = useMutation({
    mutationFn: (next: OperationValues) =>
      settingsApi.update({
        defaultDurationMinutes: Number(next.defaultDurationMinutes),
        confirmationLeadHours: Number(next.confirmationLeadHours),
        returnWindowDays: Number(next.returnWindowDays),
        lateToleranceMinutes: Number(next.lateToleranceMinutes),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.settings, saved);
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.push({ tone: "success", title: "Configurações salvas" });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "Não foi possível salvar",
        description:
          error instanceof ApiError ? error.message : "Tente de novo.",
      }),
  });

  const dirty =
    values !== null &&
    settings !== undefined &&
    (Number(values.defaultDurationMinutes) !==
      settings.defaultDurationMinutes ||
      Number(values.confirmationLeadHours) !== settings.confirmationLeadHours ||
      Number(values.returnWindowDays) !== settings.returnWindowDays ||
      Number(values.lateToleranceMinutes) !== settings.lateToleranceMinutes);

  function set(field: keyof OperationValues) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) =>
        current ? { ...current, [field]: event.target.value } : current,
      );
  }

  return (
    <Panel>
      <PanelHeader title="Operação" />
      <form
        className="p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (values) save.mutate(values);
        }}
      >
        {loading || !values ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="skeleton h-16 rounded-control" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Duração padrão da consulta"
                type="number"
                inputMode="numeric"
                disabled={!editable}
                min={BOUNDS.defaultDurationMinutes.min}
                max={BOUNDS.defaultDurationMinutes.max}
                value={values.defaultDurationMinutes}
                onChange={set("defaultDurationMinutes")}
                hint="Minutos"
              />
              <Field
                label="Antecedência da confirmação"
                type="number"
                inputMode="numeric"
                disabled={!editable}
                min={BOUNDS.confirmationLeadHours.min}
                max={BOUNDS.confirmationLeadHours.max}
                value={values.confirmationLeadHours}
                onChange={set("confirmationLeadHours")}
                hint="Horas antes da consulta"
              />
              <Field
                label="Janela de retorno"
                type="number"
                inputMode="numeric"
                disabled={!editable}
                min={BOUNDS.returnWindowDays.min}
                max={BOUNDS.returnWindowDays.max}
                value={values.returnWindowDays}
                onChange={set("returnWindowDays")}
                hint="Dias"
              />
              <Field
                label="Tolerância de atraso"
                type="number"
                inputMode="numeric"
                disabled={!editable}
                min={BOUNDS.lateToleranceMinutes.min}
                max={BOUNDS.lateToleranceMinutes.max}
                value={values.lateToleranceMinutes}
                onChange={set("lateToleranceMinutes")}
                hint="Minutos até a consulta entrar como atrasada"
              />
            </div>

            {editable ? (
              <div className="mt-4 flex gap-2">
                <Button
                  type="submit"
                  loading={save.isPending}
                  disabled={!dirty}
                >
                  Salvar
                </Button>
                {dirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setValues(null)}
                  >
                    Descartar
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </form>
    </Panel>
  );
}

function WhatsappForm() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const whatsapp = useQuery({
    queryKey: [...qk.settings, "whatsapp"],
    queryFn: settingsApi.whatsapp,
  });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [template, setTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!whatsapp.data || enabled !== null) return;
    setEnabled(whatsapp.data.whatsappEnabled);
    setTemplate(whatsapp.data.whatsappTemplate);
  }, [whatsapp.data, enabled]);

  const save = useMutation({
    mutationFn: () =>
      settingsApi.updateWhatsapp({
        whatsappEnabled: enabled ?? false,
        whatsappTemplate: template ?? "",
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData([...qk.settings, "whatsapp"], saved);
      toast.push({ tone: "success", title: "Mensagem automática atualizada" });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "Não foi possível salvar",
        description:
          error instanceof ApiError ? error.message : "Tente de novo.",
      }),
  });

  return (
    <Panel>
      <PanelHeader title="Confirmação por WhatsApp" />
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {whatsapp.isPending || enabled === null ? (
          <div className="skeleton h-32 rounded-control" />
        ) : (
          <>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="size-4 rounded-marker accent-accent"
              />
              <span className="text-body font-semibold text-ink-primary">
                Enviar confirmação automática
              </span>
            </label>

            <TextareaField
              label="Mensagem"
              rows={4}
              value={template ?? ""}
              onChange={(event) => setTemplate(event.target.value)}
              disabled={!enabled}
            />
            <p className="-mt-2 text-micro text-ink-tertiary">
              Use{" "}
              <code className="font-mono">
                {"{{paciente}} {{profissional}} {{data}} {{hora}}"}
              </code>
              .
            </p>

            {whatsapp.data?.transport === "log" ? (
              <p className="rounded-control border border-warning/30 bg-warning-weak px-3 py-2 text-micro text-warning">
                O transporte está em modo de teste. As mensagens são registradas
                no log e não chegam ao paciente.
              </p>
            ) : null}

            <div>
              <Button type="submit" loading={save.isPending}>
                Salvar
              </Button>
            </div>
          </>
        )}
      </form>
    </Panel>
  );
}
