import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast, Toaster } from "sonner";
import { Calendar, Undo2, Trophy, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminResults() {
  const [markets, setMarkets] = useState([]);
  const [pending, setPending] = useState({});
  const [reversing, setReversing] = useState({});

  const load = () => api.get("/admin/markets").then(({ data }) => setMarkets(data));
  useEffect(() => { load(); }, []);

  const declareResult = async (id) => {
    const val = pending[id];
    if (!val || !/^[0-9]{2}$/.test(val)) return toast.error("Jodi result must be 2 digits (00-99)");
    try {
      const { data } = await api.post(`/admin/markets/${id}/result`, { result: val });
      toast.success(`✅ Result ${val} declared · ${data.settled} bids settled, ${data.won} winners, ₹${data.payout_total} paid`);
      setPending((p) => ({ ...p, [id]: "" }));
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const reverse = async (id) => {
    if (!window.confirm("Reverse today's result? All winning credits will be reverted and bids reset to pending.")) return;
    setReversing((s) => ({ ...s, [id]: true }));
    try {
      const { data } = await api.post(`/admin/markets/${id}/reverse-result`, {});
      toast.success(`Reversed · ${data.reverted_bids} bids reset, ${data.refunded} pts refunded`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setReversing((s) => ({ ...s, [id]: false })); }
  };

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Operations</div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Jodi Result Declaration</h1>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-900">
        Enter the <strong>2-digit jodi result</strong> (00-99) for each market. Bids on jodi & cross-bet auto-settle on this number. Haruf bets settle on the individual digits (e.g. result 37 → Bahar=3, Andar=7). Use <strong>Reverse</strong> to undo a wrong result.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="results-grid">
        {markets.map((m) => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5" data-testid={`result-card-${m.id}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display font-semibold text-slate-900 text-lg">{m.name}</div>
                <div className="text-xs text-slate-500">{m.open_time} → {m.close_time}</div>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-slate-500"><Calendar className="w-3 h-3" />{m.result_date || "—"}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase text-slate-500 mb-1">Today's Result</div>
                <div className="text-3xl font-bold text-[#0f7a6a]" data-testid={`today-${m.id}`}>{m.today_result || "**"}</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-center">
                <div className="text-[10px] uppercase text-rose-500 mb-1">Yesterday</div>
                <div className="text-3xl font-bold text-rose-600">{m.yesterday_result || "**"}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                data-testid={`result-input-${m.id}`}
                value={pending[m.id] || ""}
                onChange={(e) => setPending((p) => ({ ...p, [m.id]: e.target.value.replace(/\D/g, "").slice(0, 2) }))}
                maxLength={2}
                placeholder="37"
                className="text-center text-xl tracking-widest font-bold"
              />
              <Button onClick={() => declareResult(m.id)} className="bg-[#0f7a6a] hover:bg-[#0a5d51] text-white" data-testid={`declare-${m.id}`}>
                <Trophy className="w-4 h-4 mr-1" /> Declare
              </Button>
            </div>

            <div className="flex gap-2 mt-3">
              <Link to={`/admin/jantri?market=${m.id}`} className="flex-1">
                <Button variant="outline" className="w-full h-9 text-xs border-slate-200" data-testid={`jantri-link-${m.id}`}>
                  <BarChart3 className="w-3.5 h-3.5 mr-1" /> JANTRI Report
                </Button>
              </Link>
              {m.today_result && (
                <Button onClick={() => reverse(m.id)} disabled={reversing[m.id]} variant="outline" className="flex-1 h-9 text-xs border-rose-200 text-rose-600 hover:bg-rose-50" data-testid={`reverse-${m.id}`}>
                  <Undo2 className="w-3.5 h-3.5 mr-1" /> {reversing[m.id] ? "Reversing…" : "Reverse"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
