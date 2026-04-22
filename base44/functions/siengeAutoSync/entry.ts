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

    // Busca todos os títulos a receber do Sienge (últimos 90 dias)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const allBills = await fetchAllPages("accounts-receivable/receivable-bills", {
      startIssueDate: startDate,
      endIssueDate: endDate,
    });

    // Busca billings já importados para evitar duplicatas (pelo campo description+month)
    const existingBillings = await base44.asServiceRole.entities.Billing.list();

    let totalImported = 0;
    const results = [];

    for (const contract of contracts) {
      const enterpriseIds = contract.sienge_enterprise_ids;

      // Filtra bills que pertencem a algum dos enterprises do contrato
      const matched = allBills.filter((bill) => {
        const billEnterpriseId = bill.enterpriseId || bill.buildingId || bill.enterprise?.id;
        if (billEnterpriseId) {
          return enterpriseIds.includes(billEnterpriseId);
        }
        // fallback: busca por nota
        const note = (bill.note || "").toLowerCase();
        return enterpriseIds.some((id) => {
          const pattern = new RegExp(`\\b(obra|empreendimento|cc)\\s*[:#-]?\\s*0*${id}\\b`);
          return pattern.test(note);
        });
      });

      let imported = 0;
      for (const bill of matched) {
        const issueDate = bill.issueDate;
        const month = issueDate ? issueDate.substring(0, 7) : "";
        const note = bill.note || "";
        const docId = (bill.documentId || "").trim().toUpperCase();
        const isFD = note.toLowerCase().includes("faturamento direto") || docId === "RFD" || docId === "FD";
        const isSinal = note.toLowerCase().includes("sinal") || note.toLowerCase().includes("adiantamento");
        const value = bill.receivableBillValue || 0;
        const description = note.substring(0, 250);

        // Verifica duplicata: mesmo contrato, mesmo mês, mesma descrição e valor
        const isDuplicate = existingBillings.some(
          (b) =>
            b.contract_id === contract.id &&
            b.month === month &&
            b.description === description &&
            b.value === value
        );

        if (!isDuplicate) {
          await base44.asServiceRole.entities.Billing.create({
            contract_id: contract.id,
            type: isFD ? "fd" : "medicao",
            is_sinal: isSinal,
            description,
            value,
            month,
            date: issueDate,
          });
          imported++;
          totalImported++;
        }
      }

      results.push({ contract: contract.project, matched: matched.length, imported });
    }

    return Response.json({
      success: true,
      contracts_processed: contracts.length,
      total_imported: totalImported,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});