import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, TrendingUp, Receipt, Wallet, Download } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import ContractTable from "../components/dashboard/ContractTable";
import { formatCurrency } from "@/lib/formatCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { exportBacklogToExcel } from "@/lib/exportToExcel";

export default function Dashboard() {
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date"),
  });

  const { data: additives = [], isLoading: loadingAdditives } = useQuery({
    queryKey: ["additives"],
    queryFn: () => base44.entities.Additive.list(),
  });

  const { data: billings = [], isLoading: loadingBillings } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list(),
  });

  const isLoading = loadingContracts || loadingAdditives || loadingBillings;

  const activeContracts = contracts.filter((c) => c.status === "active");
  const totalInitial = activeContracts.reduce((s, c) => s + (c.initial_value || 0), 0);
  const totalAdditives = additives
    .filter((a) => activeContracts.some((c) => c.id === a.contract_id))
    .reduce((s, a) => s + (a.value || 0), 0);
  const totalBilled = billings
    .filter((b) => activeContracts.some((c) => c.id === b.contract_id))
    .reduce((s, b) => s + (b.value || 0), 0);
  const totalBalance = totalInitial + totalAdditives - totalBilled;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do backlog de contratos
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 self-start"
          onClick={() => exportBacklogToExcel(contracts, additives, billings)}
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Contratos Ativos"
          value={activeContracts.length}
          icon={FileText}
          subtitle={`${contracts.length} total`}
        />
        <StatsCard
          title="Valor Contratado"
          value={formatCurrency(totalInitial + totalAdditives)}
          icon={TrendingUp}
          subtitle="Inicial + aditivos"
        />
        <StatsCard
          title="Total Faturado"
          value={formatCurrency(totalBilled)}
          icon={Receipt}
          subtitle="Acumulado"
        />
        <StatsCard
          title="Saldo Backlog"
          value={formatCurrency(totalBalance)}
          icon={Wallet}
          subtitle="A faturar"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Contratos</h2>
        <ContractTable
          contracts={contracts}
          additives={additives}
          billings={billings}
        />
      </div>
    </div>
  );
}