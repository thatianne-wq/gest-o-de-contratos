import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdditiveSection({ contractId, additives, billings = [] }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", value_empresa: "", value_fd: "", date: "" });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Additive.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additives"] });
      setForm({ description: "", value_empresa: "", value_fd: "", date: "" });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Deleta billings vinculados ao aditivo antes de excluí-lo
      const linkedBillings = billings.filter((b) => b.additive_id === id);
      await Promise.all(linkedBillings.map((b) => base44.entities.Billing.delete(b.id)));
      await base44.entities.Additive.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additives"] });
      queryClient.invalidateQueries({ queryKey: ["billings"] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      contract_id: contractId,
      description: form.description,
      value_empresa: parseFloat(form.value_empresa) || 0,
      value_fd: parseFloat(form.value_fd) || 0,
      date: form.date,
    });
  };

  const totalEmpresa = additives.reduce((s, a) => s + (a.value_empresa || 0), 0);
  const totalFD = additives.reduce((s, a) => s + (a.value_fd || 0), 0);
  const total = totalEmpresa + totalFD;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">Aditivos</h3>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </p>
            <span className="text-xs text-muted-foreground">·</span>
            <p className="text-xs text-muted-foreground">
              Empresa: <span className="font-semibold text-emerald-600">{formatCurrency(totalEmpresa)}</span>
            </p>
            <span className="text-xs text-muted-foreground">·</span>
            <p className="text-xs text-muted-foreground">
              FD: <span className="font-semibold text-purple-600">{formatCurrency(totalFD)}</span>
            </p>
          </div>
        </div>
        {can("additives", "create") && (<Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Aditivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Aditivo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição do aditivo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Empresa (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.value_empresa}
                    onChange={(e) => setForm({ ...form, value_empresa: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor FD (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.value_fd}
                    onChange={(e) => setForm({ ...form, value_fd: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Adicionar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>)}
      </div>

      <div className="divide-y divide-border">
        {additives.map((additive, index) => {
          const subtotal = (additive.value_empresa || 0) + (additive.value_fd || 0);
          return (
            <div key={additive.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-muted-foreground w-6">
                  #{index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {additive.description || "Aditivo sem descrição"}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {additive.value_empresa > 0 && (
                      <span className="text-xs text-emerald-600">Empresa: {formatCurrency(additive.value_empresa)}</span>
                    )}
                    {additive.value_fd > 0 && (
                      <span className="text-xs text-purple-600">FD: {formatCurrency(additive.value_fd)}</span>
                    )}
                    {additive.date && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(additive.date), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
                {can("additives", "delete") && (
                <button
                  onClick={() => deleteMutation.mutate(additive.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                )}
              </div>
            </div>
          );
        })}
        {additives.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum aditivo cadastrado
          </div>
        )}
      </div>
    </div>
  );
}