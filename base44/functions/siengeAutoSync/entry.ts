import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUBDOMAIN = Deno.env.get("SIENGE_SUBDOMAIN");
const USERNAME = Deno.env.get("SIENGE_USERNAME");
const PASSWORD = Deno.env.get("SIENGE_PASSWORD");

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
  return `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`;
}

async function siengeGet(path, params = {}) {
  const subdomain = getSubdomain();
  const url = new URL(`https://api.sienge.com.br/${subdomain}/public/api/v1/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: getAuthHeader(), Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sienge ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

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

// Verifica se a nota do título menciona algum dos enterpriseIds do contrato
function billMatchesContract(bill, enterpriseIds) {
  const note = (bill.note || "").toLowerCase();
  return enterpriseIds.some((id) => {
    // Padrão: "obra 248", "obra: 248", "obra248", etc.
    const pattern = new RegExp(`\\b(?:obra|empreendimento|cc)[\\s:/#-]*0*${id}\\b`);
    return pattern.test(note);
  });
}

// Determina o tipo do faturamento pelo documentId
function getBillingType(bill) {
  const docId = (bill.documentId || "").trim().toUpperCase();
  const note = (bill.note || "").toLowerCase();
  if (docId === "RFD" || note.includes("faturamento direto") || note.includes(" rfd")) return "fd";
  return "medicao";
}

function getIsSinal(bill) {
  const note = (bill.note || "").toLowerCase();
  return note.includes("sinal") || note.includes("adiantamento");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os contratos com enterprises vinculadas
    const allContracts = await base44.asServiceRole.entities.Contract.list();
    const contracts = allContracts.filter(
      (c) => c.sienge_enterprise_ids && c.sienge_enterprise_ids.length > 0
    );

    if (contracts.length === 0) {
      return Response.json({ success: true, message: "Nenhum contrato com enterprises vinculadas." });
    }

    // Busca todos os títulos a receber do Sienge (paginado)
    const allBills = await fetchAllPages("accounts-receivable/receivable-bills");

    // Busca billings já existentes para checar duplicatas pelo receivableBillId
    const existingBillings = await base44.asServiceRole.entities.Billing.list();
    // Guarda os IDs do Sienge já importados (salvos no campo description como referência)
    const existingBillIds = new Set(
      existingBillings
        .map((b) => b.sienge_bill_id)
        .filter(Boolean)
    );

    let totalImported = 0;
    const results = [];

    for (const contract of contracts) {
      const enterpriseIds = contract.sienge_enterprise_ids;

      // Filtra bills que pertencem às enterprises do contrato
      const matched = allBills.filter((bill) => billMatchesContract(bill, enterpriseIds));

      let imported = 0;
      for (const bill of matched) {
        // Evita duplicatas pelo ID único do Sienge
        if (existingBillIds.has(bill.receivableBillId)) continue;

        const issueDate = bill.issueDate;
        const month = issueDate ? issueDate.substring(0, 7) : "";
        const note = (bill.note || "").substring(0, 250);

        await base44.asServiceRole.entities.Billing.create({
          contract_id: contract.id,
          type: getBillingType(bill),
          is_sinal: getIsSinal(bill),
          description: note || `NF ${bill.documentNumber || bill.receivableBillId}`,
          value: bill.receivableBillValue || 0,
          month,
          date: issueDate,
          sienge_bill_id: bill.receivableBillId,
        });

        existingBillIds.add(bill.receivableBillId);
        imported++;
        totalImported++;
      }

      results.push({ contract: contract.project, matched: matched.length, imported });
    }

    return Response.json({
      success: true,
      contracts_processed: contracts.length,
      total_bills_in_sienge: allBills.length,
      total_imported: totalImported,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});