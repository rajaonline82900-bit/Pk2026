import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast, Toaster } from "sonner";
import { Search, IndianRupee, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminJantri() {
  const [search] = useSearchParams();
  const [markets, setMarkets] = useState([]);
  const [marketId, setMarketId] = useState(search.get("market") || "");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
    return ist.toISOString().slice(0, 10);
  });
  const [gameType, setGameType] = useState("jodi");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/admin/markets").then(({ data }) => {
      setMarkets(data);
      if (!marketId && data.length) setMarketId(data[0].id);
    });
  }, []);

  const fetchReport = async () => {
    if (!marketId) return toast.error("Market select karo");
    setLoading(true);
    try {
      const { data } = await api.get("/admin/jantri-report", { params: { market_id: marketId, date, game_type: gameType } });
      setReport(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (marketId) fetchReport(); /* eslint-disable-next-line */ }, [marketId, date, gameType]);

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Reports</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">JANTRI Bet Report</h1>
        <p className="text-sm text-slate-500 mt-1">Risk analysis — total bet amount per number for a given market & date.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="text-xs font-semibold text-slate-600 mb-1">Market</div>
          <select
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            data-testid="jantri-market-select"
            className="w-full border border-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:border-[#0f7a6a]"
          >
            {markets.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Date</div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="jantri-date" className="w-44" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1">Game</div>
          <select
            value={gameType}
            onChange={(e) => setGameType(e.target.value)}
            data-testid="jantri-game-type"
            className="border border-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:border-[#0f7a6a]"
          >
            <option value="jodi">Jodi + Cross (00-99)</option>
            <option value="haruf_andar">Haruf Andar (0-9)</option>
            <option value="haruf_bahar">Haruf Bahar (0-9)</option>
          </select>
        </div>
        <Button onClick={fetchReport} disabled={loading} className="bg-[#0f7a6a] hover:bg-[#0a5d51] text-white" data-testid="jantri-refresh">
          <Search className="w-4 h-4 mr-1" /> {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Totals */}
      {report && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="Total Bet" value={`₹${report.totals.total_amount.toLocaleString("en-IN")}`} Icon={IndianRupee} color="text-[#0f7a6a]" />
          <Stat label="Total Bids" value={report.totals.total_bids} Icon={TrendingUp} color="text-orange-500" />
          <Stat label="Unique Numbers" value={`${report.totals.unique_numbers} / ${report.shape === "1x10" ? 10 : 100}`} Icon={AlertTriangle} color="text-violet-600" />
        </div>
      )}

      {/* Top 5 numbers (risk view) */}
      {report?.top?.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
          <div className="text-sm font-bold text-rose-900 mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Top 5 — Highest Risk Numbers</div>
          <div className="grid grid-cols-5 gap-2">
            {report.top.map((c, i) => (
              <div key={i} className="bg-white border border-rose-300 rounded-lg p-2 text-center">
                <div className="text-2xl font-bold text-rose-700">{c.number}</div>
                <div className="text-xs font-semibold text-rose-900">₹{c.total.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-slate-500">{c.count} bids</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {report && report.shape === "10x10" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 overflow-x-auto" data-testid="jantri-grid-10x10">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="bg-slate-100 p-1 text-slate-500 font-semibold sticky left-0">↓ \ →</th>
                {[0,1,2,3,4,5,6,7,8,9].map(c => (
                  <th key={c} className="bg-slate-100 p-1 text-slate-700 font-bold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.grid.map((row, ri) => (
                <tr key={ri}>
                  <td className="bg-slate-100 p-1 text-center font-bold text-slate-700 sticky left-0">{ri}</td>
                  {row.map((cell) => (
                    <td key={cell.number} className={`p-1.5 border border-slate-100 text-center ${cell.total > 0 ? "bg-emerald-50" : ""}`}>
                      <div className="font-bold text-[#0f7a6a] text-[11px]" data-testid={`jantri-cell-${cell.number}`}>{cell.number}</div>
                      <div className="text-slate-900 font-semibold text-[11px]">₹{cell.total}</div>
                      <div className="text-slate-400 text-[9px]">{cell.count} bid{cell.count !== 1 ? "s" : ""}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report && report.shape === "1x10" && (
        <div className="bg-white border border-slate-200 rounded-xl p-3" data-testid="jantri-grid-1x10">
          <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
            {report.grid_1d.map((cell) => (
              <div key={cell.number} className={`border rounded-lg p-3 text-center ${cell.total > 0 ? "bg-emerald-50 border-emerald-200" : "border-slate-200"}`}>
                <div className="font-bold text-2xl text-[#0f7a6a]" data-testid={`jantri-digit-${cell.number}`}>{cell.number}</div>
                <div className="text-slate-900 font-semibold text-sm mt-1">₹{cell.total}</div>
                <div className="text-slate-400 text-[10px]">{cell.count} bids</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!report && !loading && <div className="text-center py-8 text-slate-400">Select market and date to load report.</div>}
    </AdminLayout>
  );
}

function Stat({ label, value, Icon, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
