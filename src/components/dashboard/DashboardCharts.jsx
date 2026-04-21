import { formatCurrency, formatMonth } from "@/lib/formatCurrency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from "recharts";

const PROJECT_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

export default function DashboardCharts({ billings, allContracts = [], filterProject, onFilterProject }) {
  const filteredBillings = filterProject
    ? billings.filter((b) => b.contract_id === filterProject)
    : billings;

  // Agrupa faturamentos por mês
  const byMonth = {};
  filteredBillings.forEach((b) => {
    if (!b.month) return;
    if (!byMonth[b.month]) byMonth[b.month] = {};
    const key = filterProject ? (b.contract_id) : "total";
    byMonth[b.month][key] = (byMonth[b.month][key] || 0) + (b.value || 0);
  });

  const sortedMonths = Object.keys(byMonth).sort();

  const barData = sortedMonths.map((month) => ({
    month,
    label: formatMonth(month),
    ...byMonth[month],
  }));

  // Quando filtrado por projeto, mostra o nome do projeto como legenda
  const selectedContract = filterProject
    ? allContracts.find((c) => c.id === filterProject)
    : null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">Faturamento por Mês</h3>
          {selectedContract && (
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Projeto: <span className="font-medium text-primary">{selectedContract.project}</span>
            </span>
          )}
        </div>
        {filterProject && (
          <button
            onClick={() => onFilterProject("")}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {barData.length === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
          Nenhum faturamento registrado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => {
                const contract = allContracts.find((c) => c.id === name);
                return [formatCurrency(value), contract ? contract.project : "Faturado"];
              }}
              labelFormatter={(label) => label}
            />
            {filterProject ? (
              // Filtrado: mostra uma barra com o nome do projeto
              <Bar dataKey={filterProject} name={filterProject} fill="#f59e0b" radius={[4, 4, 0, 0]} />
            ) : (
              // Sem filtro: uma barra total por mês
              <Bar dataKey="total" name="Faturado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}