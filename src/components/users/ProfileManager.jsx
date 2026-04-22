import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, Check, X } from "lucide-react";

const MODULES = [
  {
    key: "contracts",
    label: "Contratos",
    description: "Cadastro e gestão de projetos",
    actions: [
      { key: "view", label: "Visualizar" },
      { key: "create", label: "Cadastrar novo" },
      { key: "edit", label: "Editar dados" },
      { key: "delete", label: "Excluir" },
      { key: "export", label: "Exportar (Excel)" },
    ],
  },
  {
    key: "billings",
    label: "Faturamentos",
    description: "Medições e FDs dos contratos",
    actions: [
      { key: "view", label: "Visualizar" },
      { key: "create", label: "Lançar faturamento" },
      { key: "delete", label: "Excluir faturamento" },
      { key: "export", label: "Exportar (Excel)" },
      { key: "sync", label: "Importar do Sienge" },
    ],
  },
  {
    key: "additives",
    label: "Aditivos",
    description: "Aditivos contratuais",
    actions: [
      { key: "view", label: "Visualizar" },
      { key: "create", label: "Cadastrar aditivo" },
      { key: "edit", label: "Editar aditivo" },
      { key: "delete", label: "Excluir aditivo" },
    ],
  },
  {
    key: "sienge",
    label: "Sienge / Integração",
    description: "Acesso ao painel de importação Sienge",
    actions: [
      { key: "view", label: "Acessar página Sienge" },
      { key: "sync", label: "Executar sincronização" },
    ],
  },
  {
    key: "users",
    label: "Usuários",
    description: "Gestão de usuários e perfis",
    actions: [
      { key: "view", label: "Visualizar usuários" },
      { key: "manage", label: "Gerenciar permissões" },
    ],
  },
];

const DEFAULT_PERMISSIONS = {
  contracts: { view: true, create: false, edit: false, delete: false, export: false },
  billings: { view: true, create: false, delete: false, export: false, sync: false },
  additives: { view: true, create: false, edit: false, delete: false },
  sienge: { view: false, sync: false },
  users: { view: false, manage: false },
};

function PermToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ProfileForm({ profile, onSave, onCancel, isPending }) {
  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [permissions, setPermissions] = useState(
    profile?.permissions
      ? { ...DEFAULT_PERMISSIONS, ...profile.permissions }
      : DEFAULT_PERMISSIONS
  );

  const togglePerm = (module, action, value) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: value },
    }));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do Perfil *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Gerente, Visualizador..."
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do perfil..."
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Módulos e permissões */}
      <div className="space-y-3">
        {MODULES.map((mod) => (
          <div key={mod.key} className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <p className="text-sm font-semibold">{mod.label}</p>
              <p className="text-xs text-muted-foreground">{mod.description}</p>
            </div>
            <div className="divide-y divide-border">
              {mod.actions.map((action) => (
                <div key={action.key} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-foreground">{action.label}</span>
                  <PermToggle
                    checked={permissions[mod.key]?.[action.key] ?? false}
                    onChange={(val) => togglePerm(mod.key, action.key, val)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel} size="sm">
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button onClick={() => onSave({ name, description, permissions })} disabled={!name || isPending} size="sm">
          <Check className="w-4 h-4 mr-1" /> {isPending ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </div>
    </div>
  );
}

export default function ProfileManager() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => base44.entities.Profile.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Profile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profiles"] }); setCreating(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Profile.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profiles"] }); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Profile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  });

  const countActive = (profile) => {
    let count = 0;
    Object.values(profile.permissions || {}).forEach((group) => {
      Object.values(group).forEach((v) => { if (v) count++; });
    });
    return count;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Perfis de Acesso</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina por módulo o que cada perfil pode fazer
          </p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> Novo Perfil
          </Button>
        )}
      </div>

      {creating && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold mb-4">Novo Perfil</p>
          <ProfileForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setCreating(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 && !creating ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum perfil criado ainda</p>
          <Button size="sm" className="mt-3" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> Criar primeiro perfil
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {editingId === profile.id ? (
                <div className="p-5">
                  <p className="text-sm font-semibold mb-4">Editar: {profile.name}</p>
                  <ProfileForm
                    profile={profile}
                    onSave={(data) => updateMutation.mutate({ id: profile.id, data })}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.description || "Sem descrição"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {countActive(profile)} ações permitidas
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(profile.id)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(profile.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}