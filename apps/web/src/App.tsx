import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { AgendaPage } from "@/features/agenda/agenda-page";
import { AppointmentDetailPage } from "@/features/appointments/appointment-detail-page";
import { NewAppointmentPage } from "@/features/appointments/new-appointment-page";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { LoginPage } from "@/features/auth/login-page";
import { ResetPasswordPage } from "@/features/auth/reset-password-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { DocumentsPage } from "@/features/documents/documents-page";
import { NewPatientPage } from "@/features/patients/new-patient-page";
import { PatientDetailPage } from "@/features/patients/patient-detail-page";
import { PatientsPage } from "@/features/patients/patients-page";
import { ProfessionalDetailPage } from "@/features/professionals/professional-detail-page";
import { ProfessionalsPage } from "@/features/professionals/professionals-page";
import { CommandPalette } from "@/features/search/command-palette";
import { SettingsPage } from "@/features/settings/settings-page";
import { TasksPage } from "@/features/tasks/tasks-page";
import { WaitingRoomPage } from "@/features/waiting-room/waiting-room-page";
import { createQueryClient } from "@/lib/query";
import { ThemeProvider } from "@/lib/theme";

export default function App() {
  // Um cliente por montagem: criar no corpo do módulo vaza cache entre testes.
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <Shell />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function Shell() {
  const { status } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);

  // ⌘K / Ctrl+K abre a paleta de qualquer lugar da aplicação autenticada.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-app">
        <p className="text-body text-ink-secondary">Restaurando a sessão…</p>
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route
          element={<AppShell onOpenCommand={() => setCommandOpen(true)} />}
        >
          <Route
            path="/"
            element={
              <DashboardPage onOpenCommand={() => setCommandOpen(true)} />
            }
          />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/sala-de-espera" element={<WaitingRoomPage />} />

          <Route path="/consultas/nova" element={<NewAppointmentPage />} />
          <Route path="/consultas/:id" element={<AppointmentDetailPage />} />

          <Route path="/pacientes" element={<PatientsPage />} />
          <Route path="/pacientes/novo" element={<NewPatientPage />} />
          <Route path="/pacientes/:id" element={<PatientDetailPage />} />

          <Route path="/profissionais" element={<ProfessionalsPage />} />
          <Route
            path="/profissionais/:id"
            element={<ProfessionalDetailPage />}
          />

          <Route path="/documentos" element={<DocumentsPage />} />
          <Route path="/pendencias" element={<TasksPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/entrar" element={<Navigate to="/" replace />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      </Routes>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </>
  );
}
