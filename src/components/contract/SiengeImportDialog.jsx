import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatCurrency";

export default function SiengeImportDialog({ contract, contractId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bills, setBills] = useState([]);
  const [selected, setSelected] = useState([]);

  const enterpriseIds = contract?.sienge_enterprise_ids || [];
  const hasEnterprises = enterpriseIds.length > 0;

  const fetchBills = async () => {
    if (!hasEnterprises) return;
    setLoading(true);
    setBills([]);
    setSelected([]);
    try {
      const res = await base44.functions.invoke("siengeSync", {
        action: "fetchReceivables",
        enterprise_ids: enterpriseIds,
      });
      setBills(res.data?.bills || []);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen) => {
    setOpen(isOpen);
    if (isOpen) fetchBills();
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === bills.length) {
      setSelected([]);
    } else {
      setSelected(bills.map((b) => b.id));
    }
  };

  const handleImport = async () => {
    const toImport = bills.filter((b) => selected.includes(b.id));
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await base44.functions.invoke("siengeSync", {
        action: "importBills",
        contract_id: contractId,
        bills: toImport,
      });
      queryClient.invalidateQueries({ queryKey: ["billings"] });
      setOpen(false);
    } finally {
      setImporting(false);
    }
  };

  if (!hasEnterprises) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Download className="w-3.5 h-3.5" />
          Importar Sienge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar do Sienge</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhuma cobrança encontrada no Sienge para os centros de custo vinculados.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.length === bills.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs text-muted-foreground">
                  {selected.length} de {bills.length} selecionados
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-border border rounded-lg">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
                  onClick={() => toggleSelect(bill.id)}
                >
                  <Checkbox
                    checked={selected.includes(bill.id)}
                    onCheckedChange={() => toggleSelect(bill.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bill.description || bill.documentNumber || "Cobrança"}</p>
                    <p className="text-xs text-muted-foreground">{bill.dueDate || ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bill.type && (
                      <Badge variant="outline" className={bill.type === "fd" ? "bg-purple-100 text-purple-700 border-purple-200 text-xs" : "bg-blue-100 text-blue-700 border-blue-200 text-xs"}>
                        {bill.type === "fd" ? "FD" : "Medição"}
                      </Badge>
                    )}
                    <span className="text-sm font-semibold">{formatCurrency(bill.value || bill.amount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleImport} disabled={selected.length === 0 || importing}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Importar {selected.length > 0 ? `(${selected.length})` : ""}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}