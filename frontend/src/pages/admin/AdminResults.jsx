import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast, Toaster } from "sonner";

export default function AdminResults() {
  const [markets, setMarkets] = useState([]);
  const [pending, setPending] = useState({});

  const load = () => api.get("/admin/markets").then(({data})=>setMarkets(data));
  useEffect(() => { load(); }, []);

  const declareResult = async (id, type) => {
    const val = pending[`${id}-${type}`];
    if (!val || !/^[0-9]{3}$/.test(val)) return toast.error("Pana must be 3 digits");
    try {
      const body = type === "open" ? { open_pana: val } : { close_pana: val };
      const { data } = await api.post(`/admin/markets/${id}/result`, body);
      toast.success(`Result declared · ${data.settled} bids settled, ${data.won} winners, ${data.payout_total} pts paid`);
      setPending(p => ({...p, [`${id}-${type}`]: ""}));
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Operations</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Result Declaration</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-900">
        Declare 3-digit pana for each session. The system automatically calculates open/close digits and Jodi, evaluates pending bids and credits winners instantly.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="results-grid">
        {markets.map(m => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5" data-testid={`result-card-${m.id}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display font-semibold text-slate-900">{m.name}</div>
                <div className="text-xs text-slate-500">{m.open_time} → {m.close_time}</div>
              </div>
              <div className="text-xs text-slate-500">Date: {m.result_date || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ResultInput label="Open Pana" current={m.open_result} value={pending[`${m.id}-open`] || ""}
                onChange={(v) => setPending(p => ({...p, [`${m.id}-open`]: v}))}
                onDeclare={() => declareResult(m.id, "open")} testid={`open-${m.id}`} />
              <ResultInput label="Close Pana" current={m.close_result} value={pending[`${m.id}-close`] || ""}
                onChange={(v) => setPending(p => ({...p, [`${m.id}-close`]: v}))}
                onDeclare={() => declareResult(m.id, "close")} testid={`close-${m.id}`} />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}

function ResultInput({ label, current, value, onChange, onDeclare, testid }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1">{label}</div>
      <div className="font-mono text-base text-[#FF7A00] mb-2">{current || "***"}</div>
      <Input data-testid={`result-input-${testid}`} value={value} onChange={(e)=>onChange(e.target.value.replace(/\D/g,"").slice(0,3))} maxLength={3} placeholder="000" className="tracking-widest text-center" />
      <Button data-testid={`result-declare-${testid}`} onClick={onDeclare} className="w-full mt-2 btn-brand h-9 text-sm">Declare</Button>
    </div>
  );
}
