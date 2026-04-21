import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { motion } from "framer-motion";

const statusMap = {
  active: { label: "Ativo", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed: { label: "Concluído", className: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border-red-200" },
};

function getContractTotals(contract, contractAdditives, contractBillings) {
  const initialEmpresa = contract.initial_value_empresa ?? contract.initial_value ?? 0;
  const initialFD = contract.initial_value_fd || 0;
  const initialTotal = initialEmpresa + initialFD;

  const additivesEmpresa = contractAdditives.reduce((s, a) => s + (a.value_empresa || 0), 0);
  const additivesFD = contractAdditives.reduce((s, a) => s + (a.value_fd || 0), 0);
  const additivesTotal = additivesEmpresa + additivesFD;

  const totalBilled = contractBillings.reduce((s, b) => s + (b.value || 0), 0);
  const balance = initialTotal + additivesTotal - totalBilled;

  return { initialTotal, additivesTotal, totalBilled, balance };
}

export default function ContractTable({ contracts, additives, billings }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Projeto</th>
              <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Cliente</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Contrato Inicial</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Aditivos</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Faturado</th>
              <th className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Saldo</th>
              <th className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract, index) => {
              const contractAdditives = additives.filter((a) => a.contract_id === contract.id);
              const contractBillings = billings.filter((b) => b.contract_id === contract.id);
              const { initialTotal, additivesTotal, totalBilled, balance } = getContractTotals(contract, contractAdditives, contractBillings);
              const status = statusMap[contract.status] || statusMap.active;
              return (
                <motion.tr
                  key={contract.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-sm text-foreground">{contract.project}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{contract.client}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(initialTotal)}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(additivesTotal)}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(totalBilled)}</td>
                  <td className={`px-6 py-4 text-sm text-right font-bold ${balance < 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {formatCurrency(balance)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/contracts/${contract.id}`}
                      className="p-2 rounded-lg hover:bg-muted transition-colors inline-flex"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {contracts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum contrato cadastrado
        </div>
      )}
    </div>
  );
}