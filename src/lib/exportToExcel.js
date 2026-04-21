import * as XLSX from "xlsx";

export function exportBacklogToExcel(contracts, additives, billings) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo de contratos
  const resumoData = contracts.map((c) => {
    const contractAdditives = additives.filter((a) => a.contract_id === c.id);
    const contractBillings = billings.filter((b) => b.contract_id === c.id);

    const initialEmpresa = c.initial_value_empresa ?? c.initial_value ?? 0;
    const initialFD = c.initial_value_fd || 0;
    const initialTotal = initialEmpresa + initialFD;

    const addEmpresa = contractAdditives.reduce((s, a) => s + (a.value_empresa || 0), 0);
    const addFD = contractAdditives.reduce((s, a) => s + (a.value_fd || 0), 0);
    const addTotal = addEmpresa + addFD;

    const billedMedicao = contractBillings.filter((b) => (b.type || "medicao") === "medicao").reduce((s, b) => s + (b.value || 0), 0);
    const billedFD = contractBillings.filter((b) => b.type === "fd").reduce((s, b) => s + (b.value || 0), 0);
    const billedTotal = billedMedicao + billedFD;

    const balance = initialTotal + addTotal - billedTotal;

    return {
      Projeto: c.project,
      Cliente: c.client,
      "Contrato Empresa (R$)": initialEmpresa,
      "Contrato FD (R$)": initialFD,
      "Contrato Total (R$)": initialTotal,
      "Aditivos Empresa (R$)": addEmpresa,
      "Aditivos FD (R$)": addFD,
      "Aditivos Total (R$)": addTotal,
      "Valor Total Contrato (R$)": initialTotal + addTotal,
      "Faturado Medição (R$)": billedMedicao,
      "Faturado FD (R$)": billedFD,
      "Total Faturado (R$)": billedTotal,
      "Saldo (R$)": balance,
      Status: c.status === "active" ? "Ativo" : c.status === "completed" ? "Concluído" : "Cancelado",
      "Data Início": c.start_date || "",
    };
  });

  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  wsResumo["!cols"] = [
    { wch: 28 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 20 },
    { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 22 },
    { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Backlog");

  // Sheet 2: Aditivos
  const additivesData = additives.map((a) => {
    const contract = contracts.find((c) => c.id === a.contract_id);
    return {
      Projeto: contract?.project || "",
      Cliente: contract?.client || "",
      "Descrição": a.description || "",
      "Valor Empresa (R$)": a.value_empresa || 0,
      "Valor FD (R$)": a.value_fd || 0,
      "Total (R$)": (a.value_empresa || 0) + (a.value_fd || 0),
      Data: a.date || "",
    };
  });

  const wsAdditives = XLSX.utils.json_to_sheet(additivesData);
  wsAdditives["!cols"] = [
    { wch: 28 }, { wch: 28 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAdditives, "Aditivos");

  // Sheet 3: Faturamento
  const billingData = billings
    .sort((a, b) => (a.month || "").localeCompare(b.month || ""))
    .map((b) => {
      const contract = contracts.find((c) => c.id === b.contract_id);
      return {
        Projeto: contract?.project || "",
        Cliente: contract?.client || "",
        "Mês Referência": b.month || "",
        Tipo: b.type === "fd" ? "FD" : "Medição",
        Descrição: b.description || "",
        "Valor Faturado (R$)": b.value || 0,
        Data: b.date || "",
      };
    });

  const wsBilling = XLSX.utils.json_to_sheet(billingData);
  wsBilling["!cols"] = [
    { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBilling, "Faturamento");

  XLSX.writeFile(wb, `backlog_contratos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}