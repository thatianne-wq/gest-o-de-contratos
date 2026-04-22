import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBacklogToExcel } from "@/lib/exportToExcel";
import { Input } from "@/components/ui/input";
import ContractTable from "../components/dashboard/ContractTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useAccessFilter } from "@/hooks/useAccessFilter";
import { usePermissions } from "@/hooks/usePermissions";

export default function Contracts() {
  const [search, setSearch] = useState("");

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date"),
  });

  const { data: additives = [] } = useQuery({
    queryKey: ["additives"],
    queryFn: () => base44.entities.Additive.list(),
  });

  const { data: billings = [] } = useQuery({
    queryKey: ["billings"],
    queryFn: () => base44.entities.Billing.list(),
  });

  const { allowedContracts } = useAccessFilter(contracts);
  const { can, isAdmin } = usePermissions();

  const filtered = allowedContracts.filter(
    (c) =>
      c.project?.toLowerCase().includes(search.toLowerCase()) ||
      c.client?.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingContracts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} contratos
          </p>
        </div>
        <div className="flex gap-2">
          {(isAdmin || can("contracts", "export")) && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => exportBacklogToExcel(allowedContracts, additives, billings)}
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
          )}
          {(isAdmin || can("contracts", "create")) && (
            <Link to="/contracts/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Contrato
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por projeto ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <ContractTable
        contracts={filtered}
        additives={additives}
        billings={billings}
      />
    </div>
  );
}