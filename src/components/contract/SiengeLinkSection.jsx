import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, X, Link2, CheckCircle2 } from "lucide-react";

export default function SiengeLinkSection({ contract, onSave }) {
  const [enterprises, setEnterprises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(contract?.sienge_enterprise_ids || []);
  const [saving, setSaving] = useState(false);

  async function loadEnterprises() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("siengeSync", { action: "get_cost_centers" });
      setEnterprises(res.data.cost_centers || []);
    } catch (e) {
      alert("Erro ao carregar centros de custo: " + e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEnterprises();
  }, []);

  useEffect(() => {
    setSelected(contract?.sienge_enterprise_ids || []);
  }, [contract]);

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    await onSave(selected);
    setSaving(false);
  }

  const filtered = enterprises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    String(e.id).includes(search)
  );

  const selectedEnterprises = enterprises.filter(e => selected.includes(e.id));

  return (
    <div className="space-y-4">
      {/* Selecionados */}
      {selectedEnterprises.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEnterprises.map(e => (
            <Badge key={e.id} className="gap-1.5 bg-primary/10 text-primary border-primary/20 pr-1">
              <span className="font-mono text-xs font-bold">{e.id}</span>
              <span className="max-w-[160px] truncate">{e.name}</span>
              <button onClick={() => toggle(e.id)} className="ml-1 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {selectedEnterprises.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum centro de custo vinculado ainda.</p>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou número..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando centros de custo...
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {filtered.slice(0, 100).map(e => {
            const isSelected = selected.includes(e.id);
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <span className="font-mono text-xs font-bold text-muted-foreground w-10 shrink-0">{e.id}</span>
                <span className="text-sm flex-1 truncate">{e.name}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center py-4 text-sm text-muted-foreground">Nenhum resultado</p>
          )}
          {filtered.length > 100 && (
            <p className="text-center py-2 text-xs text-muted-foreground">Refine a busca para ver mais resultados</p>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Link2 className="w-4 h-4" />
        {saving ? "Salvando..." : "Salvar vínculos"}
      </Button>
    </div>
  );
}