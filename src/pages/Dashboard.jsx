import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, TrendingUp, Receipt, Wallet, Download } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import ContractTable from "../components/dashboard/ContractTable";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import { formatCurrency } from "@/lib/formatCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { exportBacklogToExcel } from "@/lib/exportToExcel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const [filterProject, setFilterProject] = useState("");

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

  // Filtro por projeto
  const filteredContracts = filterProject
    ? contracts.filter((c) => c.id === filterProject)
    : contracts;

  const filteredAdditives = additives.filter((a) =>
    filteredContracts.some((c) => c.id === a.contract_id)
  );
  const filteredBillings = billings.filter((b) =>
    filteredContracts.some((c) => c.id === b.contract_id)
  );

  const activeContracts = filteredContracts.filter((c) => c.status === "active");
  const totalInitial = activeContracts.reduce(
    (s, c) => s + (c.initial_value_empresa || c.initial_value || 0) + (c.initial_value_fd || 0),
    0
  );
  const totalAdditives = filteredAdditives
    .filter((a) => activeContracts.some((c) => c.id === a.contract_id))
    .reduce((s, a) => s + (a.value_empresa || 0) + (a.value_fd || 0), 0);
  const totalBilled = filteredBillings
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
        <div className="flex items-center gap-3 self-start flex-wrap">
          {/* Filtro por projeto */}
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos os projetos</SelectItem>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => exportBacklogToExcel(contracts, additives, billings)}
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Contratos Ativos"
          value={activeContracts.length}
          icon={FileText}
          subtitle={`${filteredContracts.length} total`}
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

      <DashboardCharts
        contracts={filteredContracts}
        additives={filteredAdditives}
        billings={filteredBillings}
      />

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Contratos</h2>
        <ContractTable
          contracts={filteredContracts}
          additives={filteredAdditives}
          billings={filteredBillings}
        />
      </div>
    </div>
  );
}