import { formatCurrency } from "@/lib/formatCurrency";
import { motion } from "framer-motion";

export default function BalanceSummary({ initialValue, totalAdditives, totalBilled, billings = [] }) {
  const totalContract = initialValue + totalAdditives;
  const balance = totalContract - totalBilled;
  const percentage = totalContract > 0 ? (totalBilled / totalContract) * 100 : 0;

  const totalMedicao = billings.filter((b) => (b.type || "medicao") === "medicao").reduce((s, b) => s + (b.value || 0), 0);
  const totalFD = billings.filter((b) => b.type === "fd").reduce((s, b) => s + (b.value || 0), 0);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-semibold text-foreground mb-4">Resumo Financeiro</h3>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Contrato Inicial</span>
          <span className="text-sm font-semibold">{formatCurrency(initialValue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Aditivos</span>
          <span className="text-sm font-semibold">{formatCurrency(totalAdditives)}</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Valor Total</span>
          <span className="text-sm font-bold">{formatCurrency(totalContract)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Faturado Medição</span>
          <span className="text-sm font-semibold text-blue-600">{formatCurrency(totalMedicao)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Faturado FD</span>
          <span className="text-sm font-semibold text-purple-600">{formatCurrency(totalFD)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Faturado</span>
          <span className="text-sm font-semibold text-primary">{formatCurrency(totalBilled)}</span>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
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

        <div className="border-t border-border pt-3 flex justify-between items-center">
          <span className="text-base font-semibold text-foreground">Saldo</span>
          <span className={`text-lg font-bold ${balance < 0 ? "text-destructive" : "text-emerald-600"}`}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>
    </div>
  );
}