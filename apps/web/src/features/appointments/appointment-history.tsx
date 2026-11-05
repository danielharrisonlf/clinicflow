import { useInfiniteQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  InlineError,
  TextSkeleton,
} from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { appointmentsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import {
  CHANNEL_LABEL,
  formatDate,
  formatDateTime,
  formatRelative,
} from "./labels";

/**
 * Trilha de auditoria da consulta, mais recente primeiro. Paginada por cursor:
 * consulta antiga com muitas idas e vindas não pode cortar no 20º evento.
 */
export function AppointmentHistory({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const audit = useInfiniteQuery({
    queryKey: qk.appointments.audit(appointmentId),
    queryFn: ({ pageParam }) => appointmentsApi.audit(appointmentId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? (last.meta.nextCursor ?? undefined) : undefined,
  });

  const events = audit.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Panel aria-labelledby="consulta-historico">
      <PanelHeader
        id="consulta-historico"
        title="Histórico"
        count={
          audit.data
            ? `${events.length}${audit.hasNextPage ? "+" : ""}`
            : undefined
        }
      />
      {audit.isPending ? (
        <div className="px-4 py-4 md:px-5">
          <TextSkeleton lines={5} />
        </div>
      ) : audit.isError && events.length === 0 ? (
        <ErrorState
          compact
          error={audit.error}
          title="O histórico não carregou"
          onRetry={() => void audit.refetch()}
        />
      ) : events.length === 0 ? (
        <EmptyState
          compact
          icon={History}
          title="Nada registrado ainda"
          description="Confirmações, check-in e mudanças de horário aparecem aqui, com quem fez."
        />
      ) : (
        <>
          <ol className="flex flex-col px-4 py-2 md:px-5">
            {events.map((event, index) => (
              <li key={event.id} className="relative flex gap-3 py-2.5">
                {/* Trilho da linha do tempo; some depois do último evento. */}
                {index < events.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-6 bottom-0 left-[3px] w-px bg-border-subtle"
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={
                    index === 0
                      ? "mt-1.5 size-[7px] shrink-0 rounded-full bg-accent"
                      : "mt-1.5 size-[7px] shrink-0 rounded-full bg-border-strong"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink-primary">
                    {event.title}
                  </p>
                  <p className="text-label text-ink-secondary">
                    <time
                      dateTime={event.createdAt}
                      title={formatDateTime(event.createdAt)}
                    >
                      {formatRelative(event.createdAt) ===
                      formatDate(event.createdAt)
                        ? // Mais antigo que ontem: o relativo já é a data; mostra com hora.
                          formatDateTime(event.createdAt)
                        : formatRelative(event.createdAt)}
                    </time>
                    {formatRelative(event.createdAt) !==
                    formatDate(event.createdAt) ? (
                      <span className="text-ink-tertiary">
                        {" "}
                        ({formatDateTime(event.createdAt)})
                      </span>
                    ) : null}
                    {", "}
                    {event.actorName
                      ? `por ${event.actorName}`
                      : CHANNEL_LABEL[event.channel]}
                  </p>
                  {event.reason ? (
                    <p className="mt-1 rounded-marker bg-surface-sunken px-2 py-1 text-label text-ink-primary">
                      {event.reason}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          {audit.isFetchNextPageError ? (
            <div className="px-4 pb-3 md:px-5">
              <InlineError
                error={audit.error}
                onRetry={() => void audit.fetchNextPage()}
                label="Os eventos mais antigos não carregaram."
              />
            </div>
          ) : audit.hasNextPage ? (
            <div className="border-t border-border-subtle px-4 py-3 md:px-5">
              <Button
                variant="secondary"
                size="sm"
                block
                loading={audit.isFetchingNextPage}
                onClick={() => void audit.fetchNextPage()}
              >
                Carregar eventos mais antigos
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
