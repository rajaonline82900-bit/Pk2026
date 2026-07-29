import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast, Toaster } from "sonner";
import { Trophy, Trash2, Plus, User } from "lucide-react";

const SAMPLE_NAMES = [
  "Rakesh K.", "Sunil M.", "Pooja R.", "Vikram S.", "Anjali T.",
  "Deepak V.", "Neha G.", "Ramesh P.", "Suresh L.", "Kavita N.",
  "Ajay B.", "Rekha D.", "Manoj J.", "Shreya H.", "Rohit C.",
];

export default function AdminWinners() {
  const [winners, setWinners] = useState([]);
  const [form, setForm] = useState({ name: "", amount: "", market_name: "" });
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const [w, m] = await Promise.all([
        api.get("/admin/showcase-winners"),
        api.get("/markets").catch(() => ({ data: [] })),
      ]);
      setWinners(w.data || []);
      setMarkets(m.data || []);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addWinner = async () => {
    const name = form.name.trim();
    const amount = parseInt(form.amount, 10);
    if (!name) return toast.error("Name is required");
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    try {
      await api.post("/admin/showcase-winners", { name, amount, market_name: form.market_name || undefined });
      toast.success(`Winner added: ${name} won ₹${amount}`);
      setForm({ name: "", amount: "", market_name: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const removeWinner = async (id) => {
    if (!window.confirm("Delete this winner entry?")) return;
    try {
      await api.delete(`/admin/showcase-winners/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const pickRandomName = () => {
    const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    const amount = String([500, 800, 1200, 1500, 2500, 3200, 5000, 8000, 10000, 15000, 22000, 35000][Math.floor(Math.random() * 12)]);
    const mk = markets.length > 0 ? markets[Math.floor(Math.random() * markets.length)].name : "";
    setForm({ name, amount, market_name: mk });
  };

  const real = winners.filter(w => w.source === "real").length;
  const fake = winners.filter(w => w.source === "fake").length;

  return (
    <AdminLayout>
      <Toaster position="top-center" richColors />
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white flex items-center justify-center shadow">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Today&apos;s Winners</h1>
            <p className="text-sm text-slate-500">Add real or fake winners shown in the ticker</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Shown" value={winners.length} color="from-blue-500 to-indigo-600" />
          <StatCard label="Real Winners" value={real} color="from-emerald-500 to-green-600" />
          <StatCard label="Fake / Boost" value={fake} color="from-amber-500 to-orange-600" />
        </div>

        {/* Add form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Winner</h2>
            <Button variant="outline" size="sm" onClick={pickRandomName} data-testid="random-fill-btn">🎲 Random fill</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Name</Label>
              <Input data-testid="winner-name-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rakesh K." />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input data-testid="winner-amount-input" type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="15000" />
            </div>
            <div>
              <Label>Market (optional)</Label>
              <select
                data-testid="winner-market-select"
                value={form.market_name}
                onChange={e => setForm({ ...form, market_name: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm"
              >
                <option value="">-- None --</option>
                {markets.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full h-10" onClick={addWinner} data-testid="add-winner-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Winner
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            💡 Real winners are auto-added when players win bets. Manually added entries are marked as &quot;fake&quot; internally but shown identically in the public ticker.
          </p>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">All Winners ({winners.length})</h2>
            <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading…</div>
          ) : winners.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No winners yet. Add one above.</div>
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="winners-list">
              {winners.map(w => (
                <li key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className={`w-10 h-10 rounded-full ${w.source === "real" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"} flex items-center justify-center shrink-0`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{w.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${w.source === "real" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {w.source}
                      </span>
                      {w.market_name && <span>· {w.market_name}</span>}
                      <span>· {new Date(w.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-lg text-yellow-600 tabular-nums">₹{Number(w.amount || 0).toLocaleString("en-IN")}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-rose-600" onClick={() => removeWinner(w.id)} data-testid={`delete-winner-${w.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-3 bg-gradient-to-br ${color} text-white shadow-md`}>
      <div className="text-[10px] uppercase tracking-widest opacity-90 font-bold">{label}</div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}
