import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getBrandImageBuffer } from "@/lib/fetchBrandImage";

// ---------- Paleta corporativa (ARGB com prefixo FF) ----------
const C = {
  navy: "FF1F2937",
  navySoft: "FF374151",
  orange: "FFF59E0B",
  orangeSoft: "FFFEF3C7",
  green: "FF10B981",
  greenSoft: "FFD1FAE5",
  red: "FFEF4444",
  redSoft: "FFFEE2E2",
  graySoft: "FFF3F4F6",
  white: "FFFFFFFF",
  text: "FF111827",
  muted: "FF6B7280",
  border: "FFD1D5DB",
  brandText: "FF58595B",
};

const FMT_BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const FMT_PCT = "0.0%";
const FMT_INT = "#,##0";
const FMT_DATE = "dd/mm/yyyy";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const fmtMonth = (m) => {
  if (!m) return "";
  const [y, mo] = String(m).split("-");
  return `${MONTHS_PT[parseInt(mo, 10) - 1]}/${y}`;
};
const STATUS_LABEL = { active: "Ativo", completed: "Concluído", cancelled: "Cancelado" };
const STATUS_COLOR = {
  active: { fill: C.greenSoft, color: C.green },
  completed: { fill: C.navySoft, color: C.white },
  cancelled: { fill: C.redSoft, color: C.red },
};

function thinBorder(color = C.border) {
  const edge = { style: "thin", color: { argb: color } };
  return { top: edge, bottom: edge, left: edge, right: edge };
}

// Estiliza/acrescenta uma célula com valor, fonte, preenchimento, alinhamento e borda.
function put(ws, addr, value, opts = {}) {
  const cell = ws.getCell(addr);
  if (value !== undefined) cell.value = value;
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  cell.font = {
    name: "Calibri",
    size: opts.size || 10,
    bold: !!opts.bold,
    italic: !!opts.italic,
    color: { argb: opts.color || C.text },
  };
  if (opts.fill) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
  }
  cell.alignment = {
    vertical: opts.valign || "middle",
    horizontal: opts.halign || "left",
    wrapText: !!opts.wrap,
  };
  if (!opts.noborder) cell.border = thinBorder(opts.borderColor);
  return cell;
}

// Embute a logo em A1 (altura ~2 linhas) + texto "RETROFIT ENGENHARIA" à direita.
function addBrand(workbook, ws, lastColLetter) {
  const imgId = workbook.addImage({
    buffer: getBrandImageBufferCached(),
    extension: "png",
  });
  // âncora flutuante: canto superior esquerdo, ~165x50 px (cabe em 2 linhas ~28+28)
  ws.addImage(imgId, {
    tl: { col: 0, row: 0 },
    ext: { width: 165, height: 50 },
  });

  ws.mergeCells(`C1:${lastColLetter}1`);
  put(ws, "C1", "RETROFIT", {
    color: C.brandText, size: 22, bold: true, halign: "left", noborder: true, valign: "bottom",
  });
  ws.mergeCells(`C2:${lastColLetter}2`);
  put(ws, "C2", "ENGENHARIA", {
    color: C.brandText, size: 11, halign: "left", noborder: true, valign: "top",
  });
  // A1:B2 ficam sob a imagem — mantemos sem borda
  ["A1", "B1", "A2", "B2"].forEach((a) => put(ws, a, null, { noborder: true }));

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 6; // espaçador
}

// Cache do buffer é populado antes de criar o workbook (ver exportBacklogToExcel).
let _brandBuffer = null;
function getBrandImageBufferCached() {
  return _brandBuffer;
}

// ---------- Enriquecimento de contratos ----------
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
    c, initialE, initialF, initial, addE, addF, add, total, billed,
    balance: total - billed,
    exec: total > 0 ? billed / total : 0,
  };
}

// ============= DASHBOARD EXECUTIVO =============
function buildDashboardSheet(workbook, enriched, contracts, billings) {
  const ws = workbook.addWorksheet("Dashboard Executivo", {
    views: [{ showGridLines: false }],
  });
  const lastCol = "H";

  const totalInitial = enriched.reduce((s, e) => s + e.initial, 0);
  const totalAdd = enriched.reduce((s, e) => s + e.add, 0);
  const totalContracted = totalInitial + totalAdd;
  const totalBilled = enriched.reduce((s, e) => s + e.billed, 0);
  const totalBalance = totalContracted - totalBilled;
  const pctExec = totalContracted > 0 ? totalBilled / totalContracted : 0;
  const activeCount = contracts.filter((c) => c.status === "active").length;
  const today = new Date().toLocaleDateString("pt-BR");

  addBrand(workbook, ws, lastCol);

  // Título (linha 4-5)
  ws.mergeCells("A4:H4");
  put(ws, "A4", "RELATÓRIO DE BACKLOG — CONTRATOS", {
    fill: C.navy, color: C.white, bold: true, size: 16, halign: "center", noborder: true,
  });
  ws.getRow(4).height = 30;
  ws.mergeCells("A5:H5");
  put(ws, "A5", `Gerado em ${today}`, {
    fill: C.navySoft, color: C.white, italic: true, size: 10, halign: "center", noborder: true,
  });
  ws.getRow(5).height = 20;
  ws.getRow(6).height = 6;

  // KPIs (linhas 7-9)
  ws.mergeCells("A7:H7");
  put(ws, "A7", "INDICADORES PRINCIPAIS", { fill: C.orange, color: C.white, bold: true, size: 11 });
  ws.getRow(7).height = 18;

  const kpis = [
    { lab: "A8:B8", val: "A9:B9", label: "Contratos Ativos", value: activeCount, fmt: FMT_INT },
    { lab: "C8:D8", val: "C9:D9", label: "Valor Contratado", value: totalContracted, fmt: FMT_BRL },
    { lab: "E8:F8", val: "E9:F9", label: "Total Faturado", value: totalBilled, fmt: FMT_BRL },
    { lab: "G8:H8", val: "G9:H9", label: "Saldo Backlog", value: totalBalance, fmt: FMT_BRL },
  ];
  kpis.forEach((k) => {
    ws.mergeCells(k.lab);
    ws.mergeCells(k.val);
    const labAddr = k.lab.split(":")[0];
    const valAddr = k.val.split(":")[0];
    put(ws, labAddr, k.label, { fill: C.graySoft, color: C.muted, bold: true, size: 9, halign: "center" });
    put(ws, valAddr, k.value, { fill: C.white, color: C.text, bold: true, size: 14, halign: "center", numFmt: k.fmt });
  });
  ws.getRow(8).height = 16;
  ws.getRow(9).height = 28;

  ws.getRow(10).height = 6;
  // % Execução (11-12)
  ws.mergeCells("A11:H11");
  put(ws, "A11", "% DE EXECUÇÃO", { fill: C.orangeSoft, color: C.text, bold: true, size: 10 });
  ws.getRow(11).height = 18;
  ws.mergeCells("A12:D12");
  put(ws, "A12", "Faturado / Contratado", { fill: C.white, color: C.muted, size: 9, halign: "right", bold: true });
  ws.mergeCells("E12:H12");
  put(ws, "E12", pctExec, {
    fill: pctExec >= 0.5 ? C.greenSoft : C.orangeSoft,
    color: pctExec >= 0.5 ? C.green : C.orange,
    bold: true, size: 16, halign: "center", numFmt: FMT_PCT,
  });
  ws.getRow(12).height = 24;

  // ---- TOP 5 ----
  let r = 13; // linha do título
  ws.mergeCells(`A${r}:H${r}`);
  put(ws, `A${r}`, "TOP 5 CONTRATOS POR VALOR CONTRATADO", { fill: C.navy, color: C.white, bold: true, size: 11 });
  r += 1;
  const topHeaders = ["Projeto", "Cliente", "Contratado", "Aditivos", "Faturado", "Saldo", "% Exec.", "Status"];
  topHeaders.forEach((h, i) => {
    const col = String.fromCharCode(65 + i);
    put(ws, `${col}${r}`, h, {
      fill: C.navySoft, color: C.white, bold: true, size: 9,
      halign: i >= 2 && i <= 5 ? "right" : "left",
    });
  });
  r += 1;
  const top5 = [...enriched].sort((a, b) => b.total - a.total).slice(0, 5);
  top5.forEach((e, idx) => {
    const zebra = idx % 2 ? C.graySoft : C.white;
    put(ws, `A${r}`, e.c.project, { fill: zebra, size: 9, bold: true });
    put(ws, `B${r}`, e.c.client, { fill: zebra, size: 9 });
    put(ws, `C${r}`, e.total, { fill: zebra, size: 9, halign: "right", numFmt: FMT_BRL });
    put(ws, `D${r}`, e.add, { fill: zebra, size: 9, halign: "right", numFmt: FMT_BRL });
    put(ws, `E${r}`, e.billed, { fill: zebra, size: 9, halign: "right", numFmt: FMT_BRL });
    put(ws, `F${r}`, e.balance, { fill: zebra, size: 9, halign: "right", numFmt: FMT_BRL, color: e.balance < 0 ? C.red : C.text });
    put(ws, `G${r}`, e.exec, { fill: zebra, size: 9, halign: "center", numFmt: FMT_PCT });
    const sc = STATUS_COLOR[e.c.status] || {};
    put(ws, `H${r}`, STATUS_LABEL[e.c.status] || e.c.status, {
      fill: sc.fill, color: sc.color, size: 9, halign: "center", bold: true,
    });
    r += 1;
  });
  // total top5
  const sums = [2, 3, 4, 5].map((idx) => top5.reduce((s, e) => s + [e.total, e.add, e.billed, e.balance][idx - 2], 0));
  put(ws, `A${r}`, "TOTAL TOP 5", { fill: C.orange, color: C.white, bold: true, size: 10 });
  put(ws, `B${r}`, null, { fill: C.orange, noborder: true });
  ["C", "D", "E", "F"].forEach((col, i) =>
    put(ws, `${col}${r}`, sums[i], { fill: C.orange, color: C.white, bold: true, size: 10, halign: "right", numFmt: FMT_BRL })
  );
  put(ws, `G${r}`, null, { fill: C.orange, noborder: true });
  put(ws, `H${r}`, null, { fill: C.orange, noborder: true });

  // ---- Faturamento mensal ----
  r += 2;
  ws.mergeCells(`A${r}:H${r}`);
  put(ws, `A${r}`, "FATURAMENTO MENSAL (ÚLTIMOS 12 MESES)", { fill: C.navy, color: C.white, bold: true, size: 11 });
  r += 1;
  put(ws, `A${r}`, "Mês", { fill: C.navySoft, color: C.white, bold: true, size: 9 });
  ws.mergeCells(`B${r}:E${r}`);
  put(ws, `B${r}`, "Faturado (R$)", { fill: C.navySoft, color: C.white, bold: true, size: 9, halign: "right" });
  ["C", "D", "E"].forEach((col) => put(ws, `${col}${r}`, null, { fill: C.navySoft, noborder: true }));
  ws.mergeCells(`F${r}:G${r}`);
  put(ws, `F${r}`, "% do Total", { fill: C.navySoft, color: C.white, bold: true, size: 9, halign: "center" });
  put(ws, `G${r}`, null, { fill: C.navySoft, noborder: true });
  put(ws, `H${r}`, "Acumulado", { fill: C.navySoft, color: C.white, bold: true, size: 9, halign: "right" });
  r += 1;

  const byMonth = {};
  billings.forEach((b) => { if (b.month) byMonth[b.month] = (byMonth[b.month] || 0) + (b.value || 0); });
  const last12 = Object.keys(byMonth).sort().slice(-12);
  const grandTotal = last12.reduce((s, m) => s + byMonth[m], 0);
  let acc = 0;
  last12.forEach((m, idx) => {
    const zebra = idx % 2 ? C.graySoft : C.white;
    const v = byMonth[m];
    acc += v;
    put(ws, `A${r}`, fmtMonth(m), { fill: zebra, size: 9, bold: true });
    ws.mergeCells(`B${r}:E${r}`);
    put(ws, `B${r}`, v, { fill: zebra, size: 9, halign: "right", numFmt: FMT_BRL });
    ["C", "D", "E"].forEach((col) => put(ws, `${col}${r}`, null, { fill: zebra, noborder: true }));
    ws.mergeCells(`F${r}:G${r}`);
    put(ws, `F${r}`, grandTotal > 0 ? v / grandTotal : 0, { fill: zebra, size: 9, halign: "center", numFmt: FMT_PCT });
    put(ws, `G${r}`, null, { fill: zebra, noborder: true });
    put(ws, `H${r}`, acc, { fill: zebra, size: 9, halign: "right", numFmt: FMT_BRL });
    r += 1;
  });
  put(ws, `A${r}`, "TOTAL", { fill: C.orange, color: C.white, bold: true, size: 10 });
  ws.mergeCells(`B${r}:E${r}`);
  put(ws, `B${r}`, grandTotal, { fill: C.orange, color: C.white, bold: true, size: 10, halign: "right", numFmt: FMT_BRL });
  ["C", "D", "E"].forEach((col) => put(ws, `${col}${r}`, null, { fill: C.orange, noborder: true }));
  ws.mergeCells(`F${r}:G${r}`);
  put(ws, `F${r}`, 1, { fill: C.orange, color: C.white, bold: true, size: 10, halign: "center", numFmt: FMT_PCT });
  put(ws, `G${r}`, null, { fill: C.orange, noborder: true });
  put(ws, `H${r}`, acc, { fill: C.orange, color: C.white, bold: true, size: 10, halign: "right", numFmt: FMT_BRL });

  // ---- Status ----
  r += 2;
  ws.mergeCells(`A${r}:H${r}`);
  put(ws, `A${r}`, "DISTRIBUIÇÃO POR STATUS", { fill: C.navy, color: C.white, bold: true, size: 11 });
  r += 1;
  ws.mergeCells(`A${r}:E${r}`);
  put(ws, `A${r}`, "Status", { fill: C.navySoft, color: C.white, bold: true, size: 9 });
  ["B", "C", "D", "E"].forEach((col) => put(ws, `${col}${r}`, null, { fill: C.navySoft, noborder: true }));
  ws.mergeCells(`F${r}:G${r}`);
  put(ws, `F${r}`, "Contratos", { fill: C.navySoft, color: C.white, bold: true, size: 9, halign: "center" });
  put(ws, `G${r}`, null, { fill: C.navySoft, noborder: true });
  put(ws, `H${r}`, "% do Total", { fill: C.navySoft, color: C.white, bold: true, size: 9, halign: "right" });
  r += 1;
  ["active", "completed", "cancelled"].forEach((st, idx) => {
    const zebra = idx % 2 ? C.graySoft : C.white;
    const cnt = contracts.filter((c) => c.status === st).length;
    const pct = contracts.length > 0 ? cnt / contracts.length : 0;
    const sc = STATUS_COLOR[st] || {};
    ws.mergeCells(`A${r}:E${r}`);
    put(ws, `A${r}`, STATUS_LABEL[st] || st, { fill: zebra, size: 9, bold: true, color: sc.color });
    ["B", "C", "D", "E"].forEach((col) => put(ws, `${col}${r}`, null, { fill: zebra, noborder: true }));
    ws.mergeCells(`F${r}:G${r}`);
    put(ws, `F${r}`, cnt, { fill: zebra, size: 9, halign: "center", numFmt: FMT_INT });
    put(ws, `G${r}`, null, { fill: zebra, noborder: true });
    put(ws, `H${r}`, pct, { fill: zebra, size: 9, halign: "right", numFmt: FMT_PCT });
    r += 1;
  });

  // Colunas
  ws.columns = [
    { width: 22 }, { width: 24 }, { width: 18 }, { width: 16 },
    { width: 16 }, { width: 16 }, { width: 12 }, { width: 16 },
  ];

  return ws;
}

// ============= SHEETS DE DADOS =============
function buildDataSheet(workbook, name, headers, rows, { moneyCols = [], intCols = [], dateCols = [], pctCols = [], colWidths = [] } = {}) {
  const ws = workbook.addWorksheet(name, { views: [{ showGridLines: false }] });
  const lastColLetter = String.fromCharCode(65 + headers.length - 1);

  addBrand(workbook, ws, lastColLetter);

  // Cabeçalho na linha 4
  const headerRow = 4;
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + i);
    const isNum = moneyCols.includes(i) || intCols.includes(i) || pctCols.includes(i);
    put(ws, `${col}${headerRow}`, h, {
      fill: C.navy, color: C.white, bold: true, size: 10,
      halign: isNum ? "right" : "left", wrap: true,
    });
  });
  ws.getRow(headerRow).height = 22;

  // Corpo a partir da linha 5
  rows.forEach((row, rIdx) => {
    const r = headerRow + 1 + rIdx;
    const zebra = rIdx % 2 ? C.graySoft : C.white;
    row.forEach((val, c) => {
      const col = String.fromCharCode(65 + c);
      const isMoney = moneyCols.includes(c);
      const isInt = intCols.includes(c);
      const isDate = dateCols.includes(c);
      const isPct = pctCols.includes(c);
      const isNum = isMoney || isInt || isPct;
      // Converte datas ISO (YYYY-MM-DD) para Date para formatação correta
      let cellVal = val;
      if (isDate && val) {
        const d = new Date(val + (val.length === 10 ? "T00:00:00" : ""));
        if (!isNaN(d)) cellVal = d;
      }
      put(ws, `${col}${r}`, cellVal ?? "", {
        fill: zebra,
        halign: isNum ? "right" : "left",
        numFmt: isMoney ? FMT_BRL : isInt ? FMT_INT : isPct ? FMT_PCT : isDate ? FMT_DATE : undefined,
      });
    });
  });

  if (colWidths.length) {
    ws.columns = colWidths.map((w) => ({ width: w }));
  }

  return ws;
}

// ============= EXPORT PRINCIPAL =============
export async function exportBacklogToExcel(contracts, additives, billings) {
  // Pré-carrega a logo antes de criar o workbook (addImage exige o buffer pronto)
  _brandBuffer = await getBrandImageBuffer();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Retrofit Engenharia — Backlog";
  workbook.created = new Date();

  const enriched = contracts.map((c) => enrichContract(c, additives, billings));

  // Sheet 1: Dashboard
  buildDashboardSheet(workbook, enriched, contracts, billings);

  // Sheet 2: Resumo Backlog
  const resumoHeaders = [
    "Projeto", "Cliente", "Contrato Empresa", "Contrato FD", "Contrato Total",
    "Aditivos Empresa", "Aditivos FD", "Aditivos Total", "Valor Total Contrato",
    "Faturado Medição", "Faturado FD", "Total Faturado", "Saldo", "% Execução", "Status", "Início",
  ];
  const resumoRows = enriched.map((e) => [
    e.c.project, e.c.client, e.initialE, e.initialF, e.initial,
    e.addE, e.addF, e.add, e.total,
    e.billed, 0, e.billed, e.balance, e.exec,
    STATUS_LABEL[e.c.status] || e.c.status, e.c.start_date || "",
  ]);
  buildDataSheet(workbook, "Resumo Backlog", resumoHeaders, resumoRows, {
    moneyCols: [2, 3, 4, 5, 6, 7, 8, 10, 11, 12],
    pctCols: [13],
    dateCols: [15],
    colWidths: [28, 28, 18, 14, 18, 18, 14, 18, 22, 18, 14, 18, 18, 12, 12, 12],
  });

  // Sheet 3: Aditivos
  const addHeaders = ["Projeto", "Cliente", "Descrição", "Valor Empresa", "Valor FD", "Total", "Data"];
  const addRows = additives.map((a) => {
    const contract = contracts.find((c) => c.id === a.contract_id);
    return [
      contract?.project || "", contract?.client || "", a.description || "",
      a.value_empresa || 0, a.value_fd || 0,
      (a.value_empresa || 0) + (a.value_fd || 0), a.date || "",
    ];
  });
  buildDataSheet(workbook, "Aditivos", addHeaders, addRows, {
    moneyCols: [3, 4, 5],
    dateCols: [6],
    colWidths: [28, 28, 35, 16, 12, 14, 12],
  });

  // Sheet 4: Faturamento
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
  buildDataSheet(workbook, "Faturamento", billHeaders, billRows, {
    moneyCols: [6],
    dateCols: [7],
    colWidths: [28, 28, 12, 14, 10, 30, 16, 12],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  saveAs(blob, `relatorio_backlog_${dateStr}.xlsx`);
}