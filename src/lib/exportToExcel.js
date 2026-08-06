import * as XLSX from "xlsx-js-style";

// Paleta corporativa
const C = {
  navy: "1F2937",
  navySoft: "374151",
  orange: "F59E0B",
  orangeSoft: "FEF3C7",
  green: "10B981",
  greenSoft: "D1FAE5",
  red: "EF4444",
  redSoft: "FEE2E2",
  graySoft: "F3F4F6",
  white: "FFFFFF",
  text: "111827",
  muted: "6B7280",
  border: "D1D5DB",
};

const FMT_BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const FMT_PCT = "0.0%";
const FMT_INT = "#,##0";

const BORDER = {
  top: { style: "thin", color: { rgb: C.border } },
  bottom: { style: "thin", color: { rgb: C.border } },
  left: { style: "thin", color: { rgb: C.border } },
  right: { style: "thin", color: { rgb: C.border } },
};

const A = (r, c) => XLSX.utils.encode_cell({ r, c });

function setCell(ws, addr, value, opts = {}) {
  ws[addr] = {
    t: opts.t || (typeof value === "number" ? "n" : "s"),
    v: value,
    z: opts.z,
    s: {
      font: {
        name: "Calibri",
        sz: opts.sz || 10,
        color: { rgb: opts.color || C.text },
        bold: !!opts.bold,
        italic: !!opts.italic,
      },
      fill: opts.fill ? { patternType: "solid", fgColor: { rgb: opts.fill } } : undefined,
      alignment: {
        vertical: opts.valign || "center",
        horizontal: opts.halign || "left",
        wrapText: !!opts.wrap,
      },
      border: opts.noborder ? undefined : BORDER,
    },
  };
}

function merge(ws, range) {
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push(XLSX.utils.decode_range(range));
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const fmtMonth = (m) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return `${MONTHS_PT[parseInt(mo) - 1]}/${y}`;
};
const STATUS_LABEL = { active: "Ativo", completed: "Concluído", cancelled: "Cancelado" };
const STATUS_COLOR = {
  active: { fill: C.greenSoft, color: C.green },
  completed: { fill: C.navySoft, color: C.white },
  cancelled: { fill: C.redSoft, color: C.red },
};

function enrichContract(c, additives, billings) {
  const cAdds = additives.filter((a) => a.contract_id === c.id);
  const cBills = billings.filter((b) => b.contract_id === c.id);
  const initialE = c.initial_value_empresa ?? c.initial_value ?? 0;
  const initialF = c.initial_value_fd || 0;
  const initial = initialE + initialF;
  const addE = cAdds.reduce((s, a) => s + (a.value_empresa || 0), 0);
  const addF = cAdds.reduce((s, a) => s + (a.value_fd || 0), 0);
  const add = addE + addF;
  const total = initial + add;
  const billed = cBills.reduce((s, b) => s + (b.value || 0), 0);
  return {
    c,
    initialE, initialF, initial, addE, addF, add, total, billed,
    balance: total - billed,
    exec: total > 0 ? billed / total : 0,
  };
}

// ============= DASHBOARD EXECUTIVO =============
function buildDashboardSheet(enriched, contracts, billings) {
  const ws = {};
  const COLS = 8; // A..H

  const totalInitial = enriched.reduce((s, e) => s + e.initial, 0);
  const totalAdd = enriched.reduce((s, e) => s + e.add, 0);
  const totalContracted = totalInitial + totalAdd;
  const totalBilled = enriched.reduce((s, e) => s + e.billed, 0);
  const totalBalance = totalContracted - totalBilled;
  const pctExec = totalContracted > 0 ? totalBilled / totalContracted : 0;
  const activeCount = contracts.filter((c) => c.status === "active").length;
  const today = new Date().toLocaleDateString("pt-BR");

  // ----- Título -----
  merge(ws, "A1:H1");
  setCell(ws, A(0, 0), "RELATÓRIO DE BACKLOG — CONTRATOS", {
    fill: C.navy, color: C.white, bold: true, sz: 16, halign: "center", valign: "center", noborder: true,
  });
  merge(ws, "A2:H2");
  setCell(ws, A(1, 0), `Retrofit Engenharia  ·  Gerado em ${today}`, {
    fill: C.navySoft, color: C.white, italic: true, sz: 10, halign: "center", noborder: true,
  });

  // ----- KPIs (linha 4	labels, linha 5 valores) -----
  merge(ws, "A4:H4");
  setCell(ws, A(3, 0), "INDICADORES PRINCIPAIS", {
    fill: C.orange, color: C.white, bold: true, sz: 11, halign: "left",
  });

  const kpis = [
    { span: "A5:B5", vspan: "A6:B6", label: "Contratos Ativos", value: activeCount, fmt: FMT_INT },
    { span: "C5:D5", vspan: "C6:D6", label: "Valor Contratado", value: totalContracted, fmt: FMT_BRL },
    { span: "E5:F5", vspan: "E6:F6", label: "Total Faturado", value: totalBilled, fmt: FMT_BRL },
    { span: "G5:H5", vspan: "G6:H6", label: "Saldo Backlog", value: totalBalance, fmt: FMT_BRL },
  ];
  kpis.forEach((k) => {
    merge(ws, k.span);
    merge(ws, k.vspan);
    const [labelAddr] = k.span.split(":");
    const [valAddr] = k.vspan.split(":");
    setCell(ws, labelAddr, k.label, {
      fill: C.graySoft, color: C.muted, bold: true, sz: 9, halign: "center",
    });
    setCell(ws, valAddr, k.value, {
      fill: C.white, color: C.text, bold: true, sz: 14, halign: "center", t: "n", z: k.fmt,
    });
  });

  // ----- Linha de KPIs secundários (%.Execução) -----
  merge(ws, "A8:H8");
  setCell(ws, A(7, 0), "% DE EXECUÇÃO", {
    fill: C.orangeSoft, color: C.text, bold: true, sz: 10, halign: "left",
  });
  merge(ws, "A9:D9");
  setCell(ws, A(8, 0), "Faturado / Contratado", {
    fill: C.white, color: C.muted, sz: 9, halign: "right", bold: true,
  });
  merge(ws, "E9:H9");
  setCell(ws, A(8, 4), pctExec, {
    fill: pctExec >= 0.5 ? C.greenSoft : C.orangeSoft,
    color: pctExec >= 0.5 ? C.green : C.orange,
    bold: true, sz: 16, halign: "center", t: "n", z: FMT_PCT,
  });

  // ----- TOP 5 CONTRATOS -----
  let r = 10;
  merge(ws, `A${r + 1}:H${r + 1}`);
  setCell(ws, A(r, 0), "TOP 5 CONTRATOS POR VALOR CONTRATADO", {
    fill: C.navy, color: C.white, bold: true, sz: 11, halign: "left",
  });
  r += 1;
  const topHeaders = ["Projeto", "Cliente", "Contratado", "Aditivos", "Faturado", "Saldo", "% Exec.", "Status"];
  topHeaders.forEach((h, i) =>
    setCell(ws, A(r, i), h, {
      fill: C.navySoft, color: C.white, bold: true, sz: 9, halign: i >= 2 && i <= 5 ? "right" : "left",
    })
  );
  r += 1;
  const top5 = [...enriched].sort((a, b) => b.total - a.total).slice(0, 5);
  top5.forEach((e, idx) => {
    const zebra = idx % 2 ? C.graySoft : C.white;
    setCell(ws, A(r, 0), e.c.project, { fill: zebra, sz: 9, bold: true });
    setCell(ws, A(r, 1), e.c.client, { fill: zebra, sz: 9 });
    setCell(ws, A(r, 2), e.total, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_BRL });
    setCell(ws, A(r, 3), e.add, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_BRL });
    setCell(ws, A(r, 4), e.billed, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_BRL });
    setCell(ws, A(r, 5), e.balance, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_BRL, color: e.balance < 0 ? C.red : C.text });
    setCell(ws, A(r, 6), e.exec, { fill: zebra, sz: 9, halign: "center", t: "n", z: FMT_PCT });
    const sc = STATUS_COLOR[e.c.status] || {};
    setCell(ws, A(r, 7), STATUS_LABEL[e.c.status] || e.c.status, {
      fill: sc.fill, color: sc.color, sz: 9, halign: "center", bold: true,
    });
    r += 1;
  });
  // total row
  setCell(ws, A(r, 0), "TOTAL TOP 5", { fill: C.orange, color: C.white, bold: true, sz: 10, halign: "left" });
  setCell(ws, A(r, 1), "", { fill: C.orange, noborder: true });
  for (let i = 2; i <= 5; i++) {
    const v = top5.reduce((s, e) => s + [e.total, e.add, e.billed, e.balance][i - 2], 0);
    setCell(ws, A(r, i), v, { fill: C.orange, color: C.white, bold: true, sz: 10, halign: "right", t: "n", z: FMT_BRL });
  }
  setCell(ws, A(r, 6), "", { fill: C.orange, noborder: true });
  setCell(ws, A(r, 7), "", { fill: C.orange, noborder: true });

  // ----- FATURAMENTO MENSAL -----
  r += 2;
  merge(ws, `A${r + 1}:H${r + 1}`);
  setCell(ws, A(r, 0), "FATURAMENTO MENSAL (ÚLTIMOS 12 MESES)", {
    fill: C.navy, color: C.white, bold: true, sz: 11, halign: "left",
  });
  r += 1;
  setCell(ws, A(r, 0), "Mês", { fill: C.navySoft, color: C.white, bold: true, sz: 9 });
  merge(ws, `B${r + 1}:E${r + 1}`);
  setCell(ws, A(r, 1), "Faturado (R$)", { fill: C.navySoft, color: C.white, bold: true, sz: 9, halign: "right" });
  setCell(ws, A(r, 4), "", { fill: C.navySoft, noborder: true });
  merge(ws, `F${r + 1}:G${r + 1}`);
  setCell(ws, A(r, 5), "% do Total", { fill: C.navySoft, color: C.white, bold: true, sz: 9, halign: "center" });
  setCell(ws, A(r, 6), "", { fill: C.navySoft, noborder: true });
  setCell(ws, A(r, 7), "Acumulado", { fill: C.navySoft, color: C.white, bold: true, sz: 9, halign: "right" });
  r += 1;

  const byMonth = {};
  billings.forEach((b) => { if (b.month) byMonth[b.month] = (byMonth[b.month] || 0) + (b.value || 0); });
  const sortedMonths = Object.keys(byMonth).sort();
  const last12 = sortedMonths.slice(-12);
  const grandTotal = last12.reduce((s, m) => s + byMonth[m], 0);
  let acc = 0;
  last12.forEach((m, idx) => {
    const zebra = idx % 2 ? C.graySoft : C.white;
    const v = byMonth[m];
    acc += v;
    setCell(ws, A(r, 0), fmtMonth(m), { fill: zebra, sz: 9, bold: true });
    merge(ws, `B${r + 1}:E${r + 1}`);
    setCell(ws, A(r, 1), v, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_BRL });
    setCell(ws, A(r, 2), "", { fill: zebra, noborder: true });
    setCell(ws, A(r, 3), "", { fill: zebra, noborder: true });
    setCell(ws, A(r, 4), "", { fill: zebra, noborder: true });
    merge(ws, `F${r + 1}:G${r + 1}`);
    setCell(ws, A(r, 5), grandTotal > 0 ? v / grandTotal : 0, { fill: zebra, sz: 9, halign: "center", t: "n", z: FMT_PCT });
    setCell(ws, A(r, 6), "", { fill: zebra, noborder: true });
    setCell(ws, A(r, 7), acc, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_BRL });
    r += 1;
  });
  // total
  setCell(ws, A(r, 0), "TOTAL", { fill: C.orange, color: C.white, bold: true, sz: 10 });
  merge(ws, `B${r + 1}:E${r + 1}`);
  setCell(ws, A(r, 1), grandTotal, { fill: C.orange, color: C.white, bold: true, sz: 10, halign: "right", t: "n", z: FMT_BRL });
  for (let i = 2; i <= 4; i++) setCell(ws, A(r, i), "", { fill: C.orange, noborder: true });
  merge(ws, `F${r + 1}:G${r + 1}`);
  setCell(ws, A(r, 5), 1, { fill: C.orange, color: C.white, bold: true, sz: 10, halign: "center", t: "n", z: FMT_PCT });
  setCell(ws, A(r, 6), "", { fill: C.orange, noborder: true });
  setCell(ws, A(r, 7), acc, { fill: C.orange, color: C.white, bold: true, sz: 10, halign: "right", t: "n", z: FMT_BRL });

  // ----- STATUS DOS CONTRATOS -----
  r += 2;
  merge(ws, `A${r + 1}:H${r + 1}`);
  setCell(ws, A(r, 0), "DISTRIBUIÇÃO POR STATUS", {
    fill: C.navy, color: C.white, bold: true, sz: 11, halign: "left",
  });
  r += 1;
  ["Status", "Contratos", "% do Total"].forEach((h, i) => {
    if (i === 0) { setCell(ws, A(r, 0), h, { fill: C.navySoft, color: C.white, bold: true, sz: 9 }); merge(ws, `A${r + 1}:E${r + 1}`); }
    if (i === 1) { setCell(ws, A(r, 5), h, { fill: C.navySoft, color: C.white, bold: true, sz: 9, halign: "center" }); merge(ws, `F${r + 1}:G${r + 1}`); }
    if (i === 2) { setCell(ws, A(r, 7), h, { fill: C.navySoft, color: C.white, bold: true, sz: 9, halign: "right" }); }
  });
  r += 1;
  const statuses = ["active", "completed", "cancelled"];
  statuses.forEach((st, idx) => {
    const zebra = idx % 2 ? C.graySoft : C.white;
    const cnt = contracts.filter((c) => c.status === st).length;
    const pct = contracts.length > 0 ? cnt / contracts.length : 0;
    const sc = STATUS_COLOR[st] || {};
    merge(ws, `A${r + 1}:E${r + 1}`);
    setCell(ws, A(r, 0), STATUS_LABEL[st] || st, { fill: zebra, sz: 9, bold: true, color: sc.color });
    merge(ws, `F${r + 1}:G${r + 1}`);
    setCell(ws, A(r, 5), cnt, { fill: zebra, sz: 9, halign: "center", t: "n", z: FMT_INT });
    setCell(ws, A(r, 7), pct, { fill: zebra, sz: 9, halign: "right", t: "n", z: FMT_PCT });
    r += 1;
  });

  // Larguras e alturas
  ws["!cols"] = [22, 24, 18, 16, 16, 14, 12, 16].map((w) => ({ wch: w }));
  ws["!rows"] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 6 }, {}, { hpt: 18 }, { hpt: 28 }];

  return ws;
}

// ============= SHEETS DE DADOS =============
function styleDataSheet(headers, rows, numCols, moneyCols, dateCols = [], pctCols = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Header row
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: C.white } },
        fill: { patternType: "solid", fgColor: { rgb: C.navy } },
        alignment: { vertical: "center", horizontal: numCols.includes(c) ? "right" : "left", wrapText: true },
        border: BORDER,
      };
      ws[addr].z = undefined;
    }
  }

  // Body rows
  for (let r = 1; r <= range.e.r; r++) {
    const zebra = (r - 1) % 2 ? C.graySoft : C.white;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      const isMoney = moneyCols.includes(c);
      const isNum = numCols.includes(c);
      const isDate = dateCols.includes(c);
      const isPct = pctCols.includes(c);
      ws[addr].s = {
        font: { name: "Calibri", sz: 10, color: { rgb: C.text } },
        fill: { patternType: "solid", fgColor: { rgb: zebra } },
        alignment: {
          vertical: "center",
          horizontal: isMoney || isNum || isPct ? "right" : "left",
        },
        border: BORDER,
      };
      if (isMoney) ws[addr].z = FMT_BRL;
      if (isNum && !isMoney) ws[addr].z = FMT_INT;
      if (isPct) ws[addr].z = FMT_PCT;
      if (isDate) ws[addr].z = "dd/mm/yyyy";
    }
  }

  ws["!rows"] = [{ hpt: 22 }];
  return ws;
}

export function exportBacklogToExcel(contracts, additives, billings) {
  const wb = XLSX.utils.book_new();
  const enriched = contracts.map((c) => enrichContract(c, additives, billings));

  // ===== Sheet 1: Dashboard Executivo =====
  const wsDash = buildDashboardSheet(enriched, contracts, billings);
  XLSX.utils.book_append_sheet(wb, wsDash, "Dashboard Executivo");

  // ===== Sheet 2: Resumo Backlog =====
  const resumoHeaders = [
    "Projeto", "Cliente", "Contrato Empresa", "Contrato FD", "Contrato Total",
    "Aditivos Empresa", "Aditivos FD", "Aditivos Total", "Valor Total Contrato",
    "Faturado Medição", "Faturado FD", "Total Faturado", "Saldo", "% Execução", "Status", "Início",
  ];
  const resumoRows = enriched.map((e) => [
    e.c.project, e.c.client, e.initialE, e.initialF, e.initial,
    e.addE, e.addF, e.add, e.total,
    e.billed, // simplificação: total billed (não separamos por tipo neste resumo)
    0, e.billed, e.balance, e.exec,
    STATUS_LABEL[e.c.status] || e.c.status, e.c.start_date || "",
  ]);
  const wsResumo = styleDataSheet(
    resumoHeaders, resumoRows,
    [], [2, 3, 4, 5, 6, 7, 8, 10, 11, 12], [15], [13]
  );
  wsResumo["!cols"] = [
    { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
    { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 22 },
    { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Backlog");

  // ===== Sheet 3: Aditivos =====
  const addHeaders = ["Projeto", "Cliente", "Descrição", "Valor Empresa", "Valor FD", "Total", "Data"];
  const addRows = additives.map((a) => {
    const contract = contracts.find((c) => c.id === a.contract_id);
    return [
      contract?.project || "", contract?.client || "", a.description || "",
      a.value_empresa || 0, a.value_fd || 0,
      (a.value_empresa || 0) + (a.value_fd || 0), a.date || "",
    ];
  });
  const wsAdd = styleDataSheet(addHeaders, addRows, [], [3, 4, 5], [6]);
  wsAdd["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 35 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsAdd, "Aditivos");

  // ===== Sheet 4: Faturamento =====
  const billHeaders = ["Projeto", "Cliente", "Mês Ref.", "Mês (Legível)", "Tipo", "Descrição", "Valor", "Data"];
  const billRows = [...billings]
    .sort((a, b) => (a.month || "").localeCompare(b.month || ""))
    .map((b) => {
      const contract = contracts.find((c) => c.id === b.contract_id);
      return [
        contract?.project || "", contract?.client || "",
        b.month || "", fmtMonth(b.month || ""),
        b.type === "fd" ? "FD" : "Medição", b.description || "",
        b.value || 0, b.date || "",
      ];
    });
  const wsBill = styleDataSheet(billHeaders, billRows, [], [6], [7]);
  wsBill["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 30 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsBill, "Faturamento");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `relatorio_backlog_${dateStr}.xlsx`);
}