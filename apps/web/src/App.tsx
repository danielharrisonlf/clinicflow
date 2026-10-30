import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { BrandMark } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { overlayOpen } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/spinner";
import { TextSkeleton } from "@/components/ui/states";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { LoginPage } from "@/features/auth/login-page";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";
import { CommandPalette } from "@/features/search/command-palette";
import { appointmentBackground } from "@/lib/navigation";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/lib/theme";

// Cada tela num pedaço próprio: o balcão abre no painel e não baixa a agenda,
// as configurações e o upload de documentos antes de precisar deles.
const DashboardPage = lazy(() =>
  import("@/features/dashboard/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  })),
);
const AgendaPage = lazy(() =>
  import("@/features/agenda/agenda-page").then((m) => ({
    default: m.AgendaPage,
  })),
);
const WaitingRoomPage = lazy(() =>
  import("@/features/waiting-room/waiting-room-page").then((m) => ({
    default: m.WaitingRoomPage,
  })),
);
const NewAppointmentPage = lazy(() =>
  import("@/features/appointments/new-appointment-page").then((m) => ({
    default: m.NewAppointmentPage,
  })),
);
const AppointmentDetailPage = lazy(() =>
  import("@/features/appointments/appointment-detail-page").then((m) => ({
    default: m.AppointmentDetailPage,
  })),
);
const PatientsPage = lazy(() =>
  import("@/features/patients/patients-page").then((m) => ({
    default: m.PatientsPage,
  })),
);
const NewPatientPage = lazy(() =>
  import("@/features/patients/new-patient-page").then((m) => ({
    default: m.NewPatientPage,
  })),
);
const EditPatientPage = lazy(() =>
  import("@/features/patients/new-patient-page").then((m) => ({
    default: m.EditPatientPage,
  })),
);
const PatientDetailPage = lazy(() =>
  import("@/features/patients/patient-detail-page").then((m) => ({
    default: m.PatientDetailPage,
  })),
);
const ProfessionalsPage = lazy(() =>
  import("@/features/professionals/professionals-page").then((m) => ({
    default: m.ProfessionalsPage,
  })),
);
const ProfessionalDetailPage = lazy(() =>
  import("@/features/professionals/professional-detail-page").then((m) => ({
    default: m.ProfessionalDetailPage,
  })),
);
const DocumentsPage = lazy(() =>
  import("@/features/documents/documents-page").then((m) => ({
    default: m.DocumentsPage,
  })),
);
const TasksPage = lazy(() =>
  import("@/features/tasks/tasks-page").then((m) => ({
    default: m.TasksPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/settings-page").then((m) => ({
    default: m.SettingsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/features/not-found-page").then((m) => ({
    default: m.NotFoundPage,
  })),
);
const LandingPage = lazy(() =>
  import("@/features/landing/landing-page").then((m) => ({
    default: m.LandingPage,
  })),
);

export default function App() {
  // Um cliente por montagem: criar no corpo do módulo vaza cache entre testes.
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>
                <Shell />
              </ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const { status, restoreError, retryRestore } = useAuth();
  const location = useLocation();

  // A apresentação pública não depende da API nem bloqueia a restauração
  // de sessões nas rotas de trabalho da recepção.
  if (
    location.pathname === "/conhecer" ||
    (location.pathname === "/" && status === "anonymous")
  ) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-surface-marketing">
            <BrandMark size="lg" />
          </div>
        }
      >
        <LandingPage />
      </Suspense>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-app px-6 text-center">
        <BrandMark size="lg" />
        {restoreError ? (
          <>
            <p className="text-card font-semibold text-ink-primary">
              Sem conexão com o servidor
            </p>
            <p className="max-w-sm text-body text-ink-secondary">
              Sua sessão continua guardada. Assim que a rede voltar, é só tentar
              de novo.
            </p>
            <Button onClick={retryRestore}>Tentar de novo</Button>
          </>
        ) : (
          <p className="flex items-center gap-2 text-body text-ink-secondary">
            <Spinner className="size-4 text-accent" />
            Restaurando a sessão…
          </p>
        )}
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route
          path="*"
          element={
            // Guarda o endereço pedido: depois do login a pessoa volta para ele.
            <Navigate
              to="/entrar"
              replace
              state={{ from: `${location.pathname}${location.search}` }}
            />
          }
        />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const backgroundLocation = appointmentBackground(location);

  // ⌘K / Ctrl+K abre a paleta de qualquer lugar da aplicação autenticada.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key &&
        event.key.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        // Uma tarefa aberta mantém o foco; a busca não empilha outro diálogo.
        if (overlayOpen() && !commandOpen) return;
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  const page = (node: React.ReactNode) => (
    <Suspense fallback={<TextSkeleton lines={4} className="max-w-xl pt-2" />}>
      {node}
    </Suspense>
  );

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route
          element={
            <AppShell
              onOpenCommand={() => setCommandOpen(true)}
              detailOpen={Boolean(backgroundLocation)}
            />
          }
        >
          <Route path="/" element={page(<DashboardPage />)} />
          <Route path="/agenda" element={page(<AgendaPage />)} />
          <Route path="/sala-de-espera" element={page(<WaitingRoomPage />)} />

          <Route
            path="/consultas/nova"
            element={page(<NewAppointmentPage />)}
          />
          <Route
            path="/consultas/:id"
            element={page(<AppointmentDetailPage />)}
          />

          <Route path="/pacientes" element={page(<PatientsPage />)} />
          <Route path="/pacientes/novo" element={page(<NewPatientPage />)} />
          <Route path="/pacientes/:id" element={page(<PatientDetailPage />)} />
          <Route
            path="/pacientes/:id/editar"
            element={page(<EditPatientPage />)}
          />

          <Route path="/profissionais" element={page(<ProfessionalsPage />)} />
          <Route
            path="/profissionais/:id"
            element={page(<ProfessionalDetailPage />)}
          />

          <Route path="/documentos" element={page(<DocumentsPage />)} />
          <Route path="/pendencias" element={page(<TasksPage />)} />
          <Route path="/configuracoes" element={page(<SettingsPage />)} />

          <Route path="*" element={page(<NotFoundPage />)} />
        </Route>
        <Route path="/entrar" element={<LoginRedirect />} />
        <Route path="/recuperar-senha" element={<Navigate to="/" replace />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      </Routes>

      {backgroundLocation ? (
        <Routes location={location}>
          <Route
            path="/consultas/:id"
            element={
              <ErrorBoundary resetKey={location.pathname}>
                {page(<AppointmentDetailPage onClose={() => navigate(-1)} />)}
              </ErrorBoundary>
            }
          />
        </Routes>
      ) : null}

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </>
  );
}

/** Logou agora: volta para onde estava indo, ou para o painel. */
function LoginRedirect() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const safe = from?.startsWith("/") && !from.startsWith("//") ? from : "/";
  return <Navigate to={safe} replace />;
}
