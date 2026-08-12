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
import { useAccessFilter } from "@/hooks/useAccessFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const [filterProject, setFilterProject] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [yearFilter, setYearFilter] = useState("all"); // "all" ou "AAAA"
  const [exporting, setExporting] = useState(false);

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

  const { allowedContracts } = useAccessFilter(contracts);

  const isLoading = loadingContracts || loadingAdditives || loadingBillings;

  // Filtro por projeto (aplicado sobre contratos permitidos)
  const projectFilteredContracts = filterProject
    ? allowedContracts.filter((c) => c.id === filterProject)
    : allowedContracts;

  // Filtro por status: Ativos (active) | Inativos (demais) | Todos
  const statusFilteredContracts = projectFilteredContracts.filter((c) => {
    if (statusFilter === "active") return c.status === "active";
    if (statusFilter === "inactive") return c.status !== "active";
    return true;
  });

  // Anos disponíveis (a partir dos faturamentos e datas de início dos contratos)
  const availableYears = Array.from(
    new Set([
      ...billings.map((b) => (b.month || "").substring(0, 4)),
      ...projectFilteredContracts.map((c) => (c.start_date || "").substring(0, 4)),
    ].filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  // Filtro por ano: contrato visível se tem faturamento ou início naquele ano
  const filteredContracts =
    yearFilter !== "all"
      ? statusFilteredContracts.filter(
          (c) =>
            (c.start_date || "").startsWith(yearFilter) ||
            billings.some(
              (b) => b.contract_id === c.id && (b.month || "").startsWith(yearFilter)
            )
        )
      : statusFilteredContracts;

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
              {allowedContracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Filtro por status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          {/* Filtro por ano */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await exportBacklogToExcel(contracts, additives, billings);
              } catch (e) {
                console.error(e);
                alert("Falha ao gerar o Excel: " + (e?.message || "erro desconhecido"));
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download className="w-4 h-4" />
            {exporting ? "Gerando..." : "Exportar Excel"}
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
        billings={filteredBillings}
        allContracts={filteredContracts}
        filterProject={filterProject}
        onFilterProject={setFilterProject}
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