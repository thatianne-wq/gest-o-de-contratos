import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatMonth } from "@/lib/formatCurrency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function BillingSection({ contractId, billings }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", value: "", month: "", date: "" });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Billing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      setForm({ description: "", value: "", month: "", date: "" });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Billing.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billings"] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      contract_id: contractId,
      description: form.description,
      value: parseFloat(form.value) || 0,
      month: form.month,
      date: form.date,
    });
  };

  const total = billings.reduce((s, b) => s + (b.value || 0), 0);

  // Group by month
  const byMonth = billings.reduce((acc, b) => {
    const key = b.month || "Sem mês";
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const sortedMonths = Object.keys(byMonth).sort().reverse();

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">Faturamento</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {billings.length} lançamento(s) · Total: {formatCurrency(total)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Faturamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Faturamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição do faturamento"
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
                  <Label>Mês de Referência *</Label>
                  <Input
                    type="month"
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: e.target.value })}
                    required
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
        </Dialog>
      </div>

      <div>
        {sortedMonths.map((month) => {
          const monthTotal = byMonth[month].reduce((s, b) => s + (b.value || 0), 0);
          return (
            <div key={month}>
              <div className="px-6 py-2 bg-muted/50 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {formatMonth(month)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {formatCurrency(monthTotal)}
                </span>
              </div>
              <div className="divide-y divide-border">
                {byMonth[month].map((billing) => (
                  <div key={billing.id} className="flex items-center justify-between px-6 py-3">
                    <p className="text-sm text-foreground">
                      {billing.description || "Faturamento"}
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{formatCurrency(billing.value)}</span>
                      <button
                        onClick={() => deleteMutation.mutate(billing.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {billings.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum faturamento cadastrado
          </div>
        )}
      </div>
    </div>
  );
}