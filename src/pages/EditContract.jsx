import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditContract() {
  const path = window.location.pathname;
  const contractId = path.split("/contracts/")[1]?.replace("/edit", "");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const contract = contracts.find((c) => c.id === contractId);

  const [form, setForm] = useState({
    project: "",
    client: "",
    initial_value_empresa: "",
    initial_value_fd: "",
    start_date: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    if (contract) {
      setForm({
        project: contract.project || "",
        client: contract.client || "",
        initial_value_empresa: contract.initial_value_empresa ?? contract.initial_value ?? "",
        initial_value_fd: contract.initial_value_fd ?? "",
        start_date: contract.start_date || "",
        status: contract.status || "active",
        notes: contract.notes || "",
      });
    }
  }, [contract]);

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.update(contractId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      navigate(`/contracts/${contractId}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      initial_value_empresa: parseFloat(form.initial_value_empresa) || 0,
      initial_value_fd: parseFloat(form.initial_value_fd) || 0,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Contrato não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 md:pb-0">
      <Link to={`/contracts/${contractId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Voltar para o contrato
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Editar Contrato</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="project">Projeto *</Label>
              <Input
                id="project"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">Contrato Inicial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial_value_empresa">Valor Empresa (R$)</Label>
                <Input
                  id="initial_value_empresa"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.initial_value_empresa}
                  onChange={(e) => setForm({ ...form, initial_value_empresa: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_value_fd">Valor FD (R$)</Label>
                <Input
                  id="initial_value_fd"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.initial_value_fd}
                  onChange={(e) => setForm({ ...form, initial_value_fd: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Link to={`/contracts/${contractId}`}>
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}