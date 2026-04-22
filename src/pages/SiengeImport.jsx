import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCw, CheckCircle2, AlertCircle, Download, Search, Link2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { format } from "date-fns";

export default function SiengeImport() {
  const [connectionStatus, setConnectionStatus] = useState(null); // null | "ok" | "error"
  const [connectionMsg, setConnectionMsg] = useState("");
  const [testing, setTesting] = useState(false);

  const [loadingBills, setLoadingBills] = useState(false);
  const [bills, setBills] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedBills, setSelectedBills] = useState(new Set());
  const [importContractId, setImportContractId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: () => base44.entities.Contract.list("-created_date"),
  });

  async function testConnection() {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const res = await base44.functions.invoke("siengeSync", { action: "test" });
      setConnectionStatus("ok");
      setConnectionMsg(res.data.message);
    } catch (e) {
      setConnectionStatus("error");
      setConnectionMsg(e.message || "Erro ao conectar com Sienge");
    }
    setTesting(false);
  }

  async function loadBills() {
    setLoadingBills(true);
    setBills([]);
    setSelectedBills(new Set());
    try {
      const params = { action: "get_receivables" };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await base44.functions.invoke("siengeSync", params);
      setBills(res.data.bills || []);
    } catch (e) {
      alert("Erro ao buscar faturamentos: " + (e.message || e));
    }
    setLoadingBills(false);
  }

  function toggleBill(id) {
    setSelectedBills(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const filtered = filteredBills();
    if (selectedBills.size === filtered.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(filtered.map(b => b.receivableBillId)));
    }
  }

  function filteredBills() {
    if (!searchText) return bills;
    const q = searchText.toLowerCase();
    return bills.filter(b =>
      (b.note || "").toLowerCase().includes(q) ||
      (b.documentNumber || "").toLowerCase().includes(q) ||
      (b.documentId || "").toLowerCase().includes(q)
    );
  }

  async function handleImport() {
    if (!importContractId) return alert("Selecione um contrato.");
    if (selectedBills.size === 0) return alert("Selecione ao menos um faturamento.");

    setImporting(true);
    setImportResult(null);
    try {
      const selectedItems = bills.filter(b => selectedBills.has(b.receivableBillId));
      const res = await base44.functions.invoke("siengeSync", {
        action: "import_bills",
        contractId: importContractId,
        bills: selectedItems,
      });
      setImportResult({ success: true, imported: res.data.imported });
      setSelectedBills(new Set());
    } catch (e) {
      setImportResult({ success: false, error: e.message });
    }
    setImporting(false);
    setShowImportDialog(false);
  }

  const visible = filteredBills();
  const docTypeColor = (docId) => {
    const d = (docId || "").trim().toUpperCase();
    if (d === "NFS" || d === "NF") return "bg-blue-100 text-blue-800";
    if (d === "RFD") return "bg-purple-100 text-purple-800";
    if (d === "PCT") return "bg-orange-100 text-orange-800";
    if (d === "CAU") return "bg-yellow-100 text-yellow-800";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar do Sienge</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Busque e importe faturamentos do Sienge diretamente para seus contratos
        </p>
      </div>

      {/* Conexão */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-medium text-sm">Status da conexão com Sienge</p>
          {connectionStatus === "ok" && (
            <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4" /> {connectionMsg}
            </p>
          )}
          {connectionStatus === "error" && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4" /> {connectionMsg}
            </p>
          )}
          {!connectionStatus && (
            <p className="text-sm text-muted-foreground mt-1">Clique em testar para verificar a conexão</p>
          )}
        </div>
        <Button variant="outline" onClick={testConnection} disabled={testing} className="gap-2 shrink-0">
          <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testando..." : "Testar conexão"}
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-sm text-foreground">Buscar faturamentos no Sienge</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Data início (emissão)</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data fim (emissão)</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={loadBills} disabled={loadingBills} className="w-full gap-2">
              <Download className={`w-4 h-4 ${loadingBills ? "animate-bounce" : ""}`} />
              {loadingBills ? "Buscando..." : "Buscar faturamentos"}
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de resultados */}
      {loadingBills && (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {bills.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Barra de ações */}
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filtrar por descrição, número..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground">{selectedBills.size} selecionados</span>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedBills.size === visible.length ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
              {selectedBills.size > 0 && (
                <Button size="sm" className="gap-2" onClick={() => setShowImportDialog(true)}>
                  <Link2 className="w-4 h-4" />
                  Importar {selectedBills.size}
                </Button>
              )}
            </div>
          </div>

          {/* Resultado importação */}
          {importResult && (
            <div className={`px-4 py-3 text-sm flex items-center gap-2 ${importResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-destructive"}`}>
              {importResult.success
                ? <><CheckCircle2 className="w-4 h-4" /> {importResult.imported} faturamento(s) importado(s) com sucesso!</>
                : <><AlertCircle className="w-4 h-4" /> Erro: {importResult.error}</>
              }
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 py-3 px-4 text-left"></th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Tipo / Nº</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Emissão</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Descrição</th>
                  <th className="py-3 px-4 text-right font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(bill => (
                  <tr
                    key={bill.receivableBillId}
                    className={`border-b border-border cursor-pointer transition-colors hover:bg-muted/20 ${selectedBills.has(bill.receivableBillId) ? "bg-primary/5" : ""}`}
                    onClick={() => toggleBill(bill.receivableBillId)}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedBills.has(bill.receivableBillId)}
                        onChange={() => toggleBill(bill.receivableBillId)}
                        onClick={e => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${docTypeColor(bill.documentId)}`}>
                        {(bill.documentId || "").trim() || "—"}
                      </span>
                      <span className="ml-2 text-muted-foreground">{bill.documentNumber}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      {bill.issueDate ? format(new Date(bill.issueDate), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                      {bill.note || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(bill.receivableBillValue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
            {visible.length} de {bills.length} faturamentos exibidos
          </div>
        </div>
      )}

      {/* Dialog de importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar faturamentos para contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione o contrato local para vincular os <strong>{selectedBills.size}</strong> faturamentos selecionados.
            </p>
            <div className="space-y-1">
              <Label>Contrato de destino</Label>
              <Select value={importContractId} onValueChange={setImportContractId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contrato..." />
                </SelectTrigger>
                <SelectContent>
                  {contracts.filter(c => c.status === "active").map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.project} — {c.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importing || !importContractId} className="gap-2">
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {importing ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}