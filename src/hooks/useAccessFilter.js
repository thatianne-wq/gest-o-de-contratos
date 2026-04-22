import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Retorna os contratos que o usuário atual tem permissão de ver.
 * Admin (role="admin" ou is_admin=true no UserAccess) vê tudo.
 */
export function useAccessFilter(contracts = []) {
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: myAccesses = [] } = useQuery({
    queryKey: ["useraccesses", currentUser?.email],
    queryFn: () => base44.entities.UserAccess.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  if (!currentUser) return { allowedContracts: contracts, isAdmin: false, isLoading: true };

  const isAdmin = currentUser.role === "admin";
  if (isAdmin) return { allowedContracts: contracts, isAdmin: true, isLoading: false, canEdit: () => true, editableIds: contracts.map(c => c.id) };

  const access = myAccesses[0];

  if (access?.is_admin) return { allowedContracts: contracts, isAdmin: true, isLoading: false, canEdit: () => true, editableIds: contracts.map(c => c.id) };

  const allowedIds = access?.allowed_contract_ids || [];
  const editableIds = access?.editable_contract_ids || [];
  const allowedContracts = contracts.filter((c) => allowedIds.includes(c.id));

  const canEdit = (contractId) => editableIds.includes(contractId);

  return { allowedContracts, isAdmin: false, isLoading: false, canEdit, editableIds };
}