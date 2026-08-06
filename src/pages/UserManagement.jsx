import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, User, Check, ChevronDown, ChevronUp, Search, Eye, Pencil, Users, Layers, Plus, Trash2, Power, PowerOff } from "lucide-react";
import ProfileManager from "@/components/users/ProfileManager";

export default function UserManagement() {
  const [tab, setTab] = useState("users");
  const queryClient = useQueryClient();
  const [expandedUser, setExpandedUser] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: accesses = [], isLoading: loadingAccesses } = useQuery({
    queryKey: ["useraccesses"],
    queryFn: () => base44.entities.UserAccess.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => base44.entities.Profile.list(),
  });

  const createAccessMutation = useMutation({
    mutationFn: async (email) => {
      // 1. Convida o usuário para o workspace (sem isso, não consegue logar)
      try {
        await base44.users.inviteUser(email.trim().toLowerCase(), "user");
      } catch (err) {
        // Ignora se já for membro do workspace
        const msg = (err?.message || "").toLowerCase();
        if (!msg.includes("already") && !msg.includes("exist") && !msg.includes("membro")) {
          throw err;
        }
      }
      // 2. Cria o registro de permissões internas do app
      return base44.entities.UserAccess.create({
        user_email: email.trim().toLowerCase(),
        is_active: true,
        is_admin: false,
        allowed_contract_ids: [],
        editable_contract_ids: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["useraccesses"] });
      setNewEmail("");
      setAddingUser(false);
    },
    onError: (err) => {
      alert("Erro ao cadastrar usuário: " + (err?.message || "tente novamente"));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ accessId, userEmail, contractIds, editableIds, isAdmin, profileId }) => {
      const payload = {
        allowed_contract_ids: contractIds,
        editable_contract_ids: editableIds,
        is_admin: isAdmin,
        profile_id: profileId || null,
      };
      if (accessId) {
        return base44.entities.UserAccess.update(accessId, payload);
      } else {
        return base44.entities.UserAccess.create({ user_email: userEmail, is_active: true, ...payload });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["useraccesses"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.UserAccess.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["useraccesses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserAccess.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["useraccesses"] }),
  });

  const handleAddUser = () => {
    if (!newEmail.trim()) return;
    const alreadyExists = accesses.find((a) => a.user_email === newEmail.trim().toLowerCase());
    if (alreadyExists) { alert("Este email já está cadastrado."); return; }
    createAccessMutation.mutate(newEmail);
  };

  const isLoading = loadingContracts || loadingAccesses;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre emails autorizados e defina permissões de acesso
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "users" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" /> Usuários
        </button>
        <button
          onClick={() => setTab("profiles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "profiles" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" /> Perfis
        </button>
      </div>

      {tab === "profiles" && <ProfileManager />}

      {tab === "users" && (
        <>
          {/* Adicionar novo usuário */}
          <div className="bg-card border border-border rounded-xl p-4">
            {!addingUser ? (
              <button
                onClick={() => setAddingUser(true)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Cadastrar novo usuário por email
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUser()}
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" onClick={handleAddUser} disabled={createAccessMutation.isPending}>
                  {createAccessMutation.isPending ? "Salvando..." : "Adicionar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingUser(false); setNewEmail(""); }}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {accesses.map((access) => {
                const isActive = access.is_active !== false;
                const isExpanded = expandedUser === access.id;
                const assignedProfile = profiles.find((p) => p.id === access.profile_id);

                return (
                  <div
                    key={access.id}
                    className={`bg-card rounded-xl border shadow-sm overflow-hidden transition-colors ${
                      isActive ? "border-border" : "border-border opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between p-4">
                      {/* Info — clicável para expandir */}
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setExpandedUser(isExpanded ? null : access.id)}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          access.is_admin ? "bg-primary/10" : "bg-muted"
                        }`}>
                          {access.is_admin
                            ? <Shield className="w-4 h-4 text-primary" />
                            : <User className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{access.user_email}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {!isActive && (
                              <Badge variant="outline" className="text-xs text-destructive border-destructive/30">Desativado</Badge>
                            )}
                            {access.is_admin ? (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Admin</Badge>
                            ) : assignedProfile ? (
                              <Badge variant="outline" className="text-xs">{assignedProfile.name}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {(access.allowed_contract_ids || []).length} projeto(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1">
                        <button
                          title={isActive ? "Desativar acesso" : "Ativar acesso"}
                          onClick={() => toggleActiveMutation.mutate({ id: access.id, is_active: !isActive })}
                          className={`p-2 rounded-lg transition-colors ${
                            isActive
                              ? "hover:bg-amber-50 text-amber-600"
                              : "hover:bg-green-50 text-green-600"
                          }`}
                        >
                          {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          title="Excluir usuário"
                          onClick={() => {
                            if (confirm(`Remover acesso de ${access.user_email}?`)) {
                              deleteMutation.mutate(access.id);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedUser(isExpanded ? null : access.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          }
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-5 space-y-4">
                        <UserPermissionPanel
                          access={access}
                          contracts={contracts}
                          profiles={profiles}
                          onSave={({ contractIds, editableIds, isAdmin, profileId }) =>
                            saveMutation.mutate({
                              accessId: access.id,
                              userEmail: access.user_email,
                              contractIds,
                              editableIds,
                              isAdmin,
                              profileId,
                            })
                          }
                          isPending={saveMutation.isPending}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {accesses.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                  Nenhum usuário cadastrado ainda. Adicione um email acima.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserPermissionPanel({ access, contracts, profiles, onSave, isPending }) {
  const [isAdmin, setIsAdmin] = useState(access?.is_admin || false);
  const [selectedIds, setSelectedIds] = useState(access?.allowed_contract_ids || []);
  const [editableIds, setEditableIds] = useState(access?.editable_contract_ids || []);
  const [profileId, setProfileId] = useState(access?.profile_id || "");
  const [search, setSearch] = useState("");

  const filtered = contracts.filter(
    (c) =>
      c.project.toLowerCase().includes(search.toLowerCase()) ||
      c.client.toLowerCase().includes(search.toLowerCase())
  );

  const toggleView = (id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(id)) setEditableIds((e) => e.filter((x) => x !== id));
      return next;
    });
  };

  const toggleEdit = (id) => {
    if (!selectedIds.includes(id)) return;
    setEditableIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllView = () => {
    if (selectedIds.length === contracts.length) {
      setSelectedIds([]);
      setEditableIds([]);
    } else {
      setSelectedIds(contracts.map((c) => c.id));
    }
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
          <span className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isAdmin ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <div>
          <p className="text-sm font-medium">Administrador</p>
          <p className="text-xs text-muted-foreground">Acesso total a todos os projetos e configurações</p>
        </div>
      </div>

      {!isAdmin && (
        <>
          {profiles.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Perfil de Acesso</label>
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— Sem perfil (controle manual abaixo) —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.description ? ` — ${p.description}` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrar projetos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button onClick={toggleAllView} className="text-xs text-primary hover:underline whitespace-nowrap font-medium">
                {selectedIds.length === contracts.length ? "✕ Desmarcar todos" : "✓ Selecionar todos"}
              </button>
            </div>

            <div className="flex items-center gap-4 mb-2 px-1">
              <span className="text-xs text-muted-foreground font-medium flex-1">Projeto</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground w-16 justify-center">
                <Eye className="w-3 h-3" /> Ver
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground w-16 justify-center">
                <Pencil className="w-3 h-3" /> Editar
              </span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filtered.map((contract) => {
                const canView = selectedIds.includes(contract.id);
                const canEdit = editableIds.includes(contract.id);
                return (
                  <div
                    key={contract.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      canView ? "border-primary/30 bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{contract.project}</p>
                      <p className="text-xs text-muted-foreground truncate">{contract.client}</p>
                    </div>
                    <div className="w-16 flex justify-center">
                      <button
                        onClick={() => toggleView(contract.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          canView ? "border-primary bg-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {canView && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </div>
                    <div className="w-16 flex justify-center">
                      <button
                        onClick={() => toggleEdit(contract.id)}
                        disabled={!canView}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          canEdit
                            ? "border-amber-500 bg-amber-500"
                            : canView
                            ? "border-border hover:border-amber-400"
                            : "border-border opacity-30 cursor-not-allowed"
                        }`}
                      >
                        {canEdit && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-6 text-sm text-muted-foreground">Nenhum projeto encontrado</p>
              )}
            </div>
          </div>
        </>
      )}

      <Button
        onClick={() => onSave({
          contractIds: isAdmin ? [] : selectedIds,
          editableIds: isAdmin ? [] : editableIds,
          isAdmin,
          profileId: isAdmin ? "" : profileId,
        })}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Salvando..." : "Salvar permissões"}
      </Button>
    </div>
  );
}