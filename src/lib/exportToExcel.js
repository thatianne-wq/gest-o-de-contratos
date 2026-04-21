import * as XLSX from "xlsx";

export function exportBacklogToExcel(contracts, additives, billings) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo de contratos
  const resumoData = contracts.map((c) => {
    const totalAdditives = additives
      .filter((a) => a.contract_id === c.id)
      .reduce((s, a) => s + (a.value || 0), 0);
    const totalBilled = billings
      .filter((b) => b.contract_id === c.id)
      .reduce((s, b) => s + (b.value || 0), 0);
    const balance = (c.initial_value || 0) + totalAdditives - totalBilled;

    return {
      Projeto: c.project,
      Cliente: c.client,
      "Contrato Inicial (R$)": c.initial_value || 0,
      "Aditivos (R$)": totalAdditives,
      "Valor Total (R$)": (c.initial_value || 0) + totalAdditives,
      "Faturado Acumulado (R$)": totalBilled,
      "Saldo (R$)": balance,
      Status:
        c.status === "active"
          ? "Ativo"
          : c.status === "completed"
          ? "Concluído"
          : "Cancelado",
      "Data Início": c.start_date || "",
    };
  });

  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  wsResumo["!cols"] = [
    { wch: 30 }, { wch: 30 }, { wch: 22 }, { wch: 16 },
    { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Backlog");

  // Sheet 2: Aditivos
  const additivesData = additives.map((a) => {
    const contract = contracts.find((c) => c.id === a.contract_id);
    return {
      Projeto: contract?.project || "",
      Cliente: contract?.client || "",
      "Descrição do Aditivo": a.description || "",
      "Valor (R$)": a.value || 0,
      Data: a.date || "",
    };
  });

  const wsAdditives = XLSX.utils.json_to_sheet(additivesData);
  wsAdditives["!cols"] = [
    { wch: 30 }, { wch: 30 }, { wch: 35 }, { wch: 16 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAdditives, "Aditivos");

  // Sheet 3: Faturamento mensal
  const billingData = billings
    .sort((a, b) => (a.month || "").localeCompare(b.month || ""))
    .map((b) => {
      const contract = contracts.find((c) => c.id === b.contract_id);
      return {
        Projeto: contract?.project || "",
        Cliente: contract?.client || "",
        "Mês Referência": b.month || "",
        "Descrição": b.description || "",
        "Valor Faturado (R$)": b.value || 0,
        "Data": b.date || "",
      };
    });

  const wsBilling = XLSX.utils.json_to_sheet(billingData);
  wsBilling["!cols"] = [
    { wch: 30 }, { wch: 30 }, { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBilling, "Faturamento");

  XLSX.writeFile(wb, `backlog_contratos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}