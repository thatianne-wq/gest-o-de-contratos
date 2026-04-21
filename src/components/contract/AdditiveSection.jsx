import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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

export default function AdditiveSection({ contractId, additives }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", value: "", date: "" });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Additive.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additives"] });
      setForm({ description: "", value: "", date: "" });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Additive.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["additives"] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      contract_id: contractId,
      description: form.description,
      value: parseFloat(form.value) || 0,
      date: form.date,
    });
  };

  const total = additives.reduce((s, a) => s + (a.value || 0), 0);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">Aditivos</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {additives.length} aditivo(s) · Total: {formatCurrency(total)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
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
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
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
        </Dialog>
      </div>

      <div className="divide-y divide-border">
        {additives.map((additive, index) => (
          <div key={additive.id} className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground w-6">
                #{index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {additive.description || "Aditivo sem descrição"}
                </p>
                {additive.date && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(additive.date), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold">{formatCurrency(additive.value)}</span>
              <button
                onClick={() => deleteMutation.mutate(additive.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {additives.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum aditivo cadastrado
          </div>
        )}
      </div>
    </div>
  );
}