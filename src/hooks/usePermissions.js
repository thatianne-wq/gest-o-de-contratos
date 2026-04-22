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

  const { data: myAccesses = [] } = useQuery({
    queryKey: ["useraccesses", currentUser?.email],
    queryFn: () => base44.entities.UserAccess.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
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
  const access = myAccesses[0];
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