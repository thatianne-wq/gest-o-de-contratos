import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, User, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [expandedUser, setExpandedUser] = useState(null);

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: accesses = [], isLoading: loadingAccesses } = useQuery({
    queryKey: ["useraccesses"],
    queryFn: () => base44.entities.UserAccess.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ userEmail, contractIds, isAdmin }) => {
      const existing = accesses.find((a) => a.user_email === userEmail);
      if (existing) {
        return base44.entities.UserAccess.update(existing.id, {
          allowed_contract_ids: contractIds,
          is_admin: isAdmin,
        });
      } else {
        return base44.entities.UserAccess.create({
          user_email: userEmail,
          allowed_contract_ids: contractIds,
          is_admin: isAdmin,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["useraccesses"] }),
  });

  const isLoading = loadingUsers || loadingContracts || loadingAccesses;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina quais projetos cada usuário pode visualizar
        </p>
      </div>

      <div className="space-y-3">
        {users.map((user) => {
          const access = accesses.find((a) => a.user_email === user.email);
          const isAdmin = access?.is_admin || user.role === "admin";
          const allowedIds = access?.allowed_contract_ids || [];
          const isExpanded = expandedUser === user.id;

          return (
            <div key={user.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Header do usuário */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    {isAdmin ? (
                      <Shield className="w-4 h-4 text-primary" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">Admin — Acesso total</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {allowedIds.length === 0
                        ? "Sem acesso"
                        : `${allowedIds.length} projeto(s)`}
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Painel de permissões */}
              {isExpanded && (
                <div className="border-t border-border p-5 space-y-4">
                  <UserPermissionPanel
                    user={user}
                    contracts={contracts}
                    access={access}
                    onSave={({ contractIds, isAdmin }) =>
                      saveMutation.mutate({ userEmail: user.email, contractIds, isAdmin })
                    }
                    isPending={saveMutation.isPending}
                  />
                </div>
              )}
            </div>
          );
        })}

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum usuário encontrado
          </div>
        )}
      </div>
    </div>
  );
}

function UserPermissionPanel({ user, contracts, access, onSave, isPending }) {
  const [isAdmin, setIsAdmin] = useState(access?.is_admin || user.role === "admin");
  const [selectedIds, setSelectedIds] = useState(access?.allowed_contract_ids || []);

  const toggleContract = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === contracts.length ? [] : contracts.map((c) => c.id));
  };

  return (
    <div className="space-y-4">
      {/* Toggle admin */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <button
          onClick={() => setIsAdmin(!isAdmin)}
          className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
            isAdmin ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isAdmin ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium">Administrador</p>
          <p className="text-xs text-muted-foreground">Acesso total a todos os projetos e configurações</p>
        </div>
      </div>

      {/* Seleção de contratos (apenas se não for admin) */}
      {!isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Projetos permitidos</p>
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {selectedIds.length === contracts.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {contracts.map((contract) => {
              const selected = selectedIds.includes(contract.id);
              return (
                <button
                  key={contract.id}
                  onClick={() => toggleContract(contract.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                    selected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{contract.project}</p>
                    <p className="text-xs text-muted-foreground">{contract.client}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selected ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button
        onClick={() => onSave({ contractIds: isAdmin ? [] : selectedIds, isAdmin })}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Salvando..." : "Salvar permissões"}
      </Button>
    </div>
  );
}