import { formatCurrency } from "@/lib/formatCurrency";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899"];

function getContractTotals(contract, allAdditives, allBillings) {
  const initialEmpresa = contract.initial_value_empresa ?? contract.initial_value ?? 0;
  const initialFD = contract.initial_value_fd || 0;
  const initialTotal = initialEmpresa + initialFD;
  const additivesTotal = allAdditives
    .filter((a) => a.contract_id === contract.id)
    .reduce((s, a) => s + (a.value_empresa || 0) + (a.value_fd || 0), 0);
  const totalBilled = allBillings
    .filter((b) => b.contract_id === contract.id)
    .reduce((s, b) => s + (b.value || 0), 0);
  const balance = initialTotal + additivesTotal - totalBilled;
  return { initialTotal, additivesTotal, totalBilled, balance, contractTotal: initialTotal + additivesTotal };
}

const currencyFormatter = (v) => formatCurrency(v);

export default function DashboardCharts({ contracts, additives, billings }) {
  // Bar chart: por contrato
  const barData = contracts.map((c) => {
    const { contractTotal, totalBilled, balance } = getContractTotals(c, additives, billings);
    return {
      name: c.project.length > 14 ? c.project.slice(0, 14) + "…" : c.project,
      "Valor Contrato": contractTotal,
      "Faturado": totalBilled,
      "Saldo": balance > 0 ? balance : 0,
    };
  });

  // Pie chart: distribuição do saldo por projeto
  const pieData = contracts
    .map((c) => {
      const { balance } = getContractTotals(c, additives, billings);
      return { name: c.project, value: balance > 0 ? balance : 0 };
    })
    .filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold text-foreground mb-4">Contrato vs Faturado vs Saldo</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={currencyFormatter} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Valor Contrato" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Faturado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Saldo" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold text-foreground mb-4">Distribuição do Saldo por Projeto</h3>
        {pieData.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
            Sem saldo disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name.slice(0, 10)}… ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={currencyFormatter} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}