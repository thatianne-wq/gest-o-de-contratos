import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function NewContract() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    project: "",
    client: "",
    initial_value: "",
    start_date: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      navigate(`/contracts/${created.id}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      initial_value: parseFloat(form.initial_value) || 0,
      status: "active",
    });
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0">
      <Link to="/contracts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Voltar para contratos
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Novo Contrato</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Input
                id="project"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                placeholder="Nome do projeto"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial_value">Valor do Contrato Inicial *</Label>
              <Input
                id="initial_value"
                type="number"
                step="0.01"
                min="0"
                value={form.initial_value}
                onChange={(e) => setForm({ ...form, initial_value: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Observações sobre o contrato..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Link to="/contracts">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Criar Contrato"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}