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

export default function DashboardCharts({ contracts, additives, billings, allContracts, filterProject, onFilterProject }) {
  // Use allContracts for building chart data (so charts always show all bars/slices)
  const sourceContracts = allContracts || contracts;

  const barData = sourceContracts.map((c) => {
    const { contractTotal, totalBilled, balance } = getContractTotals(c, additives, billings);
    return {
      id: c.id,
      name: c.project.length > 14 ? c.project.slice(0, 14) + "…" : c.project,
      fullName: c.project,
      "Valor Contrato": contractTotal,
      "Faturado": totalBilled,
      "Saldo": balance > 0 ? balance : 0,
    };
  });

  const pieData = sourceContracts
    .map((c) => {
      const { balance } = getContractTotals(c, additives, billings);
      return { id: c.id, name: c.project, value: balance > 0 ? balance : 0 };
    })
    .filter((d) => d.value > 0);

  const handleBarClick = (data) => {
    if (!data || !onFilterProject) return;
    const clicked = sourceContracts.find((c) => c.project === data.activePayload?.[0]?.payload?.fullName);
    if (!clicked) return;
    onFilterProject(filterProject === clicked.id ? "" : clicked.id);
  };

  const handlePieClick = (data) => {
    if (!data || !onFilterProject) return;
    onFilterProject(filterProject === data.id ? "" : data.id);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Contrato vs Faturado vs Saldo</h3>
          <span className="text-xs text-muted-foreground">Clique para filtrar</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={barData}
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            onClick={handleBarClick}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={currencyFormatter} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Valor Contrato" radius={[4, 4, 0, 0]}>
              {barData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill="#f59e0b"
                  opacity={!filterProject || filterProject === entry.id ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar dataKey="Faturado" radius={[4, 4, 0, 0]}>
              {barData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill="#3b82f6"
                  opacity={!filterProject || filterProject === entry.id ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar dataKey="Saldo" radius={[4, 4, 0, 0]}>
              {barData.map((entry) => (
                <Cell
                  key={entry.id}
                  fill="#10b981"
                  opacity={!filterProject || filterProject === entry.id ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Distribuição do Saldo por Projeto</h3>
          <span className="text-xs text-muted-foreground">Clique para filtrar</span>
        </div>
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
                onClick={handlePieClick}
                style={{ cursor: "pointer" }}
                label={({ name, percent }) =>
                  `${name.length > 10 ? name.slice(0, 10) + "…" : name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.id}
                    fill={COLORS[i % COLORS.length]}
                    opacity={!filterProject || filterProject === entry.id ? 1 : 0.35}
                    stroke={filterProject === entry.id ? "#fff" : "none"}
                    strokeWidth={filterProject === entry.id ? 3 : 0}
                  />
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