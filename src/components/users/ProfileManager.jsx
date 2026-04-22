import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, Check, X } from "lucide-react";

const PERMISSION_GROUPS = [
  {
    key: "contracts",
    label: "Contratos",
    perms: [
      { key: "view", label: "Visualizar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "export", label: "Exportar" },
    ],
  },
  {
    key: "billings",
    label: "Faturamentos",
    perms: [
      { key: "view", label: "Visualizar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
      { key: "export", label: "Exportar" },
    ],
  },
  {
    key: "additives",
    label: "Aditivos",
    perms: [
      { key: "view", label: "Visualizar" },
      { key: "create", label: "Criar" },
      { key: "edit", label: "Editar" },
      { key: "delete", label: "Excluir" },
    ],
  },
  {
    key: "sienge",
    label: "Sienge",
    perms: [
      { key: "view", label: "Visualizar" },
      { key: "sync", label: "Sincronizar" },
    ],
  },
  {
    key: "users",
    label: "Usuários",
    perms: [
      { key: "view", label: "Visualizar" },
      { key: "manage", label: "Gerenciar" },
    ],
  },
];

const DEFAULT_PERMISSIONS = {
  contracts: { view: true, create: false, edit: false, delete: false, export: false },
  billings: { view: true, create: false, edit: false, delete: false, export: false },
  additives: { view: true, create: false, edit: false, delete: false },
  sienge: { view: false, sync: false },
  users: { view: false, manage: false },
};

function PermToggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
        checked ? "border-primary bg-primary" : "border-border hover:border-primary/50"
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white" />}
    </button>
  );
}

function ProfileForm({ profile, onSave, onCancel, isPending }) {
  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [permissions, setPermissions] = useState(
    profile?.permissions || DEFAULT_PERMISSIONS
  );

  const togglePerm = (group, perm, value) => {
    setPermissions((prev) => ({
      ...prev,
      [group]: { ...prev[group], [perm]: value },
    }));
  };

  return (
    <div className="space-y-4">
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

      {/* Tabela de permissões */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Módulo</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground">Ver</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground">Criar</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground">Editar</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground">Excluir</th>
              <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground">Exportar / Extra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PERMISSION_GROUPS.map((group) => (
              <tr key={group.key} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium text-sm">{group.label}</td>
                {["view", "create", "edit", "delete", "export_or_extra"].map((col) => {
                  // map generic column to actual perm key
                  let permKey = col === "export_or_extra"
                    ? group.perms.find((p) => p.key === "export" || p.key === "sync" || p.key === "manage")?.key
                    : group.perms.find((p) => p.key === col)?.key;

                  if (!permKey) {
                    return <td key={col} className="px-2 py-3 text-center"><span className="text-muted-foreground/30">—</span></td>;
                  }
                  return (
                    <td key={col} className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <PermToggle
                          checked={permissions[group.key]?.[permKey] ?? false}
                          onChange={(val) => togglePerm(group.key, permKey, val)}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-end">
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

  const countPerms = (profile) => {
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
          <p className="text-xs text-muted-foreground mt-0.5">Defina o que cada perfil pode visualizar, editar, excluir e exportar</p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> Novo Perfil
          </Button>
        )}
      </div>

      {/* Formulário de criação */}
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

      {/* Lista de perfis */}
      {isLoading ? (
        <div className="space-y-2">
          {Array(3).fill(0).map((_, i) => (
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
                      {countPerms(profile)} permissões ativas
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