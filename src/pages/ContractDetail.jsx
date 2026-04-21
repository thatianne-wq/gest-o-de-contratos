import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import AdditiveSection from "../components/contract/AdditiveSection";
import BillingSection from "../components/contract/BillingSection";
import BalanceSummary from "../components/contract/BalanceSummary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusMap = {
  active: { label: "Ativo", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Concluído", className: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function ContractDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const contractId = path.split("/contracts/")[1];

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading: loadingContract } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list(),
  });

  const { data: allAdditives = [], isLoading: loadingAdditives } = useQuery({
    queryKey: ["additives"],
    queryFn: () => base44.entities.Additive.list(),
  });

  const { data: allBillings = [], isLoading: loadingBillings } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Contract.delete(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      navigate("/contracts");
    },
  });

  const contract = contracts.find((c) => c.id === contractId);
  const additives = allAdditives.filter((a) => a.contract_id === contractId);
  const billings = allBillings.filter((b) => b.contract_id === contractId);

  const isLoading = loadingContract || loadingAdditives || loadingBillings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Contrato não encontrado</p>
        <Link to="/contracts" className="text-primary text-sm mt-2 inline-block">
          Voltar para contratos
        </Link>
      </div>
    );
  }

  const status = statusMap[contract.status] || statusMap.active;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Link to="/contracts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar para contratos
      </Link>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{contract.project}</h1>
              <Badge variant="outline" className={status.className}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{contract.client}</p>
            {contract.start_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Início: {format(new Date(contract.start_date), "dd/MM/yyyy")}
              </p>
            )}
            {contract.notes && (
              <p className="text-sm text-muted-foreground mt-3 bg-muted/50 rounded-lg px-4 py-2">
                {contract.notes}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/contracts/${contractId}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação não pode ser desfeita. O contrato e todos os dados associados serão removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AdditiveSection contractId={contractId} additives={additives} />
          <BillingSection contractId={contractId} billings={billings} />
        </div>
        <div>
          <BalanceSummary
            contract={contract}
            additives={additives}
            billings={billings}
          />
        </div>
      </div>
    </div>
  );
}