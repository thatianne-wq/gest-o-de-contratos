import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUBDOMAIN = Deno.env.get("SIENGE_SUBDOMAIN");
const USERNAME = Deno.env.get("SIENGE_USERNAME");
const PASSWORD = Deno.env.get("SIENGE_PASSWORD");

// Extrai apenas o subdomínio (ex: "https://retrofit.sienge.com.br/" → "retrofit")
function getSubdomain() {
  if (!SUBDOMAIN) return "";
  if (!SUBDOMAIN.includes(".") && !SUBDOMAIN.includes("/")) return SUBDOMAIN;
  try {
    const url = new URL(SUBDOMAIN.startsWith("http") ? SUBDOMAIN : `https://${SUBDOMAIN}`);
    return url.hostname.split(".")[0];
  } catch {
    return SUBDOMAIN.replace(/https?:\/\//, "").split(".")[0].split("/")[0];
  }
}

function getAuthHeader() {
  const credentials = btoa(`${USERNAME}:${PASSWORD}`);
  return `Basic ${credentials}`;
}

async function siengeGet(path, params = {}) {
  const subdomain = getSubdomain();
  const url = new URL(`https://api.sienge.com.br/${subdomain}/public/api/v1/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sienge ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

// Busca todos os itens paginados
async function fetchAllPages(path, params = {}) {
  let offset = 0;
  const limit = 200;
  const all = [];
  while (true) {
    const data = await siengeGet(path, { ...params, limit, offset });
    const items = data.results || data.data || (Array.isArray(data) ? data : []);
    all.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  return all;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== "admin") {
      return Response.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "test";

    // ─── TESTE DE CONEXÃO ─────────────────────────────────────────────
    if (action === "test") {
      const result = await siengeGet("customers", { limit: 1 });
      return Response.json({
        success: true,
        subdomain: getSubdomain(),
        customers_count: result.resultSetMetadata?.count || 0,
        message: "Conexão com Sienge estabelecida com sucesso!"
      });
    }

    // ─── BUSCAR CLIENTES ──────────────────────────────────────────────
    if (action === "get_customers") {
      const customers = await fetchAllPages("customers");
      return Response.json({
        count: customers.length,
        customers: customers.map(c => ({
          id: c.id,
          name: c.name || c.fantasyName || "",
          cnpj: c.cnpj || "",
          fantasyName: c.fantasyName || "",
        }))
      });
    }

    // ─── BUSCAR TÍTULOS A RECEBER (faturamentos) ──────────────────────
    if (action === "get_receivables") {
      const { startDate, endDate } = body;
      const params = {};
      if (startDate) params.startIssueDate = startDate;
      if (endDate) params.endIssueDate = endDate;

      const bills = await fetchAllPages("accounts-receivable/receivable-bills", params);
      return Response.json({ count: bills.length, bills });
    }

    // ─── SINCRONIZAÇÃO COMPLETA ───────────────────────────────────────
    if (action === "sync") {
      const { contractId } = body; // ID do contrato local para vincular

      if (!contractId) {
        return Response.json({ error: "contractId é obrigatório" }, { status: 400 });
      }

      // Busca clientes para identificar o cliente do contrato
      const localContract = await base44.asServiceRole.entities.Contract.get(contractId);
      if (!localContract) {
        return Response.json({ error: "Contrato não encontrado" }, { status: 404 });
      }

      // Busca todos os títulos a receber
      const bills = await fetchAllPages("accounts-receivable/receivable-bills");

      // Filtra pelos que têm menção ao contrato (pelo nome do projeto ou cliente)
      const projectName = (localContract.project || "").toLowerCase();
      const clientName = (localContract.client || "").toLowerCase();

      const matchedBills = bills.filter(b => {
        const note = (b.note || "").toLowerCase();
        return note.includes(projectName) || note.includes(clientName);
      });

      // Importa os títulos como billings
      let imported = 0;
      for (const bill of matchedBills) {
        const issueDate = bill.issueDate;
        const month = issueDate ? issueDate.substring(0, 7) : "";
        const note = bill.note || "";
        const isFD = note.toLowerCase().includes("faturamento direto") || note.toLowerCase().includes("rfd") || (bill.documentId || "").trim().toUpperCase() === "RFD";
        const isSinal = note.toLowerCase().includes("sinal") || note.toLowerCase().includes("adiantamento");

        await base44.asServiceRole.entities.Billing.create({
          contract_id: contractId,
          type: isFD ? "fd" : "medicao",
          is_sinal: isSinal,
          description: note.substring(0, 250),
          value: bill.receivableBillValue || 0,
          month,
          date: issueDate,
        });
        imported++;
      }

      return Response.json({
        success: true,
        total_bills: bills.length,
        matched: matchedBills.length,
        imported,
        message: `${imported} faturamentos importados para o contrato "${localContract.project}"`
      });
    }

    // ─── BUSCAR BILLS POR ENTERPRISES VINCULADAS ─────────────────────
    if (action === "get_bills_by_enterprises") {
      const { enterpriseIds, startDate, endDate } = body;
      if (!enterpriseIds || !enterpriseIds.length) {
        return Response.json({ error: "enterpriseIds é obrigatório" }, { status: 400 });
      }

      const params = {};
      if (startDate) params.startIssueDate = startDate;
      if (endDate) params.endIssueDate = endDate;

      const allBills = await fetchAllPages("accounts-receivable/receivable-bills", params);

      // Filtra: nota deve mencionar "obra <id>" para algum dos IDs vinculados
      const matched = allBills.filter(bill => {
        const note = (bill.note || "").toLowerCase();
        return enterpriseIds.some(id => {
          const pattern = new RegExp(`\\b(obra|empreendimento|cc)\\s*[:#-]?\\s*0*${id}\\b`);
          return pattern.test(note);
        });
      });

      return Response.json({ count: matched.length, bills: matched });
    }

    // ─── IMPORTAR BILLS SELECIONADAS MANUALMENTE ──────────────────────
    if (action === "import_bills") {
      const { contractId, bills } = body;

      if (!contractId || !bills || !bills.length) {
        return Response.json({ error: "contractId e bills são obrigatórios" }, { status: 400 });
      }

      let imported = 0;
      for (const bill of bills) {
        const issueDate = bill.issueDate;
        const month = issueDate ? issueDate.substring(0, 7) : "";
        const note = bill.note || "";
        const docId = (bill.documentId || "").trim().toUpperCase();
        const isFD = note.toLowerCase().includes("faturamento direto") || docId === "RFD" || docId === "FD";
        const isSinal = note.toLowerCase().includes("sinal") || note.toLowerCase().includes("adiantamento");

        await base44.asServiceRole.entities.Billing.create({
          contract_id: contractId,
          type: isFD ? "fd" : "medicao",
          is_sinal: isSinal,
          description: note.substring(0, 250),
          value: bill.receivableBillValue || 0,
          month,
          date: issueDate,
        });
        imported++;
      }

      return Response.json({ success: true, imported });
    }

    // ─── EXPLORAR ENDPOINT (debug) ────────────────────────────────────
    if (action === "explore") {
      const { path, params: extraParams } = body;
      const data = await siengeGet(path, { limit: 5, ...extraParams });
      return Response.json(data);
    }

    // ─── BUSCAR CENTROS DE CUSTO ──────────────────────────────────────
    if (action === "get_cost_centers") {
      const data = await fetchAllPages("enterprises");
      return Response.json({
        count: data.length,
        cost_centers: data.map(e => ({
          id: e.id,
          name: e.name,
          code: e.code || e.id,
        }))
      });
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});