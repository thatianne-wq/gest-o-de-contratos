import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function AppLayout() {
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: myAccesses = [], isLoading } = useQuery({
    queryKey: ["useraccesses", currentUser?.email],
    queryFn: () => base44.entities.UserAccess.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  // Admins nunca são bloqueados
  const isAdmin = currentUser?.role === "admin";
  const access = myAccesses[0];

  // Usuário não-admin com cadastro explicitamente desativado
  if (!isLoading && !isAdmin && access && access.is_active === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Acesso desativado</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta foi desativada. Entre em contato com o administrador do sistema.
          </p>
          <button
            onClick={() => base44.auth.logout()}
            className="text-sm text-primary hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <MobileNav />
      <main className="md:ml-64 min-h-screen">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}