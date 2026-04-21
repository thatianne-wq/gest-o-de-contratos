import { formatCurrency } from "@/lib/formatCurrency";
import { motion } from "framer-motion";

export default function BalanceSummary({ contract, additives = [], billings = [] }) {
  const initialEmpresa = contract.initial_value_empresa || contract.initial_value || 0;
  const initialFD = contract.initial_value_fd || 0;
  const initialTotal = initialEmpresa + initialFD;

  const additivesEmpresa = additives.reduce((s, a) => s + (a.value_empresa || 0), 0);
  const additivesFD = additives.reduce((s, a) => s + (a.value_fd || 0), 0);
  const additivesTotal = additivesEmpresa + additivesFD;

  const contractEmpresa = initialEmpresa + additivesEmpresa;
  const contractFD = initialFD + additivesFD;
  const contractTotal = contractEmpresa + contractFD;

  const billedMedicao = billings.filter((b) => (b.type || "medicao") === "medicao").reduce((s, b) => s + (b.value || 0), 0);
  const billedFD = billings.filter((b) => b.type === "fd").reduce((s, b) => s + (b.value || 0), 0);
  const billedTotal = billedMedicao + billedFD;

  const balance = contractTotal - billedTotal;
  const percentage = contractTotal > 0 ? (billedTotal / contractTotal) * 100 : 0;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-semibold text-foreground mb-4">Resumo Financeiro</h3>

      <div className="space-y-3">
        {/* Contrato inicial */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contrato Inicial</p>
          <div className="space-y-1.5 pl-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Empresa</span>
              <span className="text-xs font-semibold text-emerald-600">{formatCurrency(initialEmpresa)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">FD</span>
              <span className="text-xs font-semibold text-purple-600">{formatCurrency(initialFD)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-1">
              <span className="text-xs font-medium">Total</span>
              <span className="text-xs font-bold">{formatCurrency(initialTotal)}</span>
            </div>
          </div>
        </div>

        {/* Aditivos */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Aditivos</p>
          <div className="space-y-1.5 pl-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Empresa</span>
              <span className="text-xs font-semibold text-emerald-600">{formatCurrency(additivesEmpresa)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">FD</span>
              <span className="text-xs font-semibold text-purple-600">{formatCurrency(additivesFD)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-1">
              <span className="text-xs font-medium">Total</span>
              <span className="text-xs font-bold">{formatCurrency(additivesTotal)}</span>
            </div>
          </div>
        </div>

        {/* Valor total contrato */}
        <div className="border-t-2 border-border pt-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Valor Total Contrato</p>
          <div className="flex justify-between items-center pl-2">
            <span className="text-xs text-muted-foreground">Empresa</span>
            <span className="text-xs font-bold text-emerald-600">{formatCurrency(contractEmpresa)}</span>
          </div>
          <div className="flex justify-between items-center pl-2">
            <span className="text-xs text-muted-foreground">FD</span>
            <span className="text-xs font-bold text-purple-600">{formatCurrency(contractFD)}</span>
          </div>
          <div className="flex justify-between items-center pl-2">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-sm font-bold">{formatCurrency(contractTotal)}</span>
          </div>
        </div>

        {/* Faturado */}
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Faturado</p>
          <div className="flex justify-between items-center pl-2">
            <span className="text-xs text-muted-foreground">Medição</span>
            <span className="text-xs font-semibold text-blue-600">{formatCurrency(billedMedicao)}</span>
          </div>
          <div className="flex justify-between items-center pl-2">
            <span className="text-xs text-muted-foreground">FD</span>
            <span className="text-xs font-semibold text-purple-600">{formatCurrency(billedFD)}</span>
          </div>
          <div className="flex justify-between items-center pl-2">
            <span className="text-xs font-medium">Total Faturado</span>
            <span className="text-xs font-bold">{formatCurrency(billedTotal)}</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="pt-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">Progresso</span>
            <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${percentage > 100 ? "bg-destructive" : "bg-primary"}`}
            />
          </div>
        </div>

        {/* Saldo */}
        <div className="border-t-2 border-border pt-3 flex justify-between items-center">
          <span className="text-base font-semibold text-foreground">Saldo</span>
          <span className={`text-lg font-bold ${balance < 0 ? "text-destructive" : "text-emerald-600"}`}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>
    </div>
  );
}