import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook que retorna as permissões do usuário atual com base no perfil atribuído.
 * Admins têm todas as permissões. Usuários sem perfil têm apenas visualização.
 */
export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: accesses = [] } = useQuery({
    queryKey: ["useraccesses"],
    queryFn: () => base44.entities.UserAccess.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => base44.entities.Profile.list(),
  });

  if (!currentUser) {
    return { isLoading: true, can: () => false };
  }

  // Admins têm tudo liberado
  const isAdmin = currentUser.role === "admin";
  const access = accesses.find((a) => a.user_email === currentUser.email);
  const isAccessAdmin = access?.is_admin;

  if (isAdmin || isAccessAdmin) {
    return { isLoading: false, isAdmin: true, can: () => true };
  }

  // Busca perfil atribuído
  const profile = profiles.find((p) => p.id === access?.profile_id);
  const perms = profile?.permissions || {};

  // Função que verifica uma permissão específica: can("billings", "delete")
  const can = (module, action) => {
    return perms?.[module]?.[action] === true;
  };

  return { isLoading: false, isAdmin: false, can, profile };
}