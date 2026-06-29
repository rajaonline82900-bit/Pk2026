import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast, Toaster } from "sonner";
import { Calendar, Undo2, Trophy, BarChart3, Sparkles, AlertTriangle, History, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

// Admin Results — new style:
// 1. Select Game (dropdown)
// 2. Pick Date
// 3. Enter 2-digit jodi result
// 4. Big Declare button (settles bids, pays winners)
// 5. Reverse button (refunds winners if mistake)
// + Recent declarations panel showing today/past results with quick-reverse
export default function AdminResults() {
  const [markets, setMarkets] = useState([]);
  const [marketId, setMarketId] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
    return ist.toISOString().slice(0, 10);
  });
  const [result, setResult] = useState("");
  const [declaring, setDeclaring] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [history, setHistory] = useState([]);
  const [lastDeclare, setLastDeclare] = useState(null);

  const loadMarkets = () =>
    api.get("/admin/markets").then(({ data }) => {
      setMarkets(data);
      if (!marketId && data.length) setMarketId(data[0].id);
    });

  const loadHistory = (mid) => {
    if (!mid) return;
    api.get(`/markets/${mid}/result-history?limit=10`).then(({ data }) => setHistory(data.history || []));
  };

  useEffect(() => { loadMarkets(); }, []);
  useEffect(() => { if (marketId) loadHistory(marketId); }, [marketId, lastDeclare]);

  const selectedMarket = useMemo(() => markets.find((m) => m.id === marketId), [markets, marketId]);

  const declareResult = async () => {
    if (!marketId) return toast.error("Game select karo");
    if (!/^[0-9]{2}$/.test(result)) return toast.error("Result 2-digit (00-99) ka hona chahiye");
    setDeclaring(true);
    try {
      const { data } = await api.post(`/admin/markets/${marketId}/result`, { result, date });
      // Spread `data` FIRST so its `market` object doesn't overwrite our string market name (otherwise React crashes rendering an object as a child → white page)
      setLastDeclare({ ...data, market: selectedMarket?.name, date, result });
      toast.success(`✅ ${selectedMarket?.name} → ${result} declared! Winners: ${data.won}, Paid: ₹${data.payout_total}`);
      setResult("");
      loadMarkets();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setDeclaring(false); }
  };

  const reverseResult = async (reverseDate) => {
    if (!marketId) return;
    const useDate = reverseDate || date;
    if (!window.confirm(`Reverse ${selectedMarket?.name} ka ${useDate} ka result?\n\nSaare jeete hue users ke wallet se winnings kat jayengi, bids pending par wapas chale jayenge. Phir aap sahi result daal sakte ho.`)) return;
    setReversing(true);
    try {
      const { data } = await api.post(`/admin/markets/${marketId}/reverse-result`, { date: useDate });
      toast.success(`✅ Reversed! ${data.reverted_bids} bids reset, ₹${data.refunded} refunded`);
      setLastDeclare(null);
      loadHistory(marketId);
      loadMarkets();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setReversing(false); }
  };

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-blue-500 font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> OPERATIONS</div>
        <h1 className="font-display font-black text-3xl tracking-tight text-blue-900 mt-1">Result Declaration</h1>
        <p className="text-sm text-slate-500 mt-1">Select game → Pick date → Enter 2-digit result → Declare. Wrong result aaye toh Reverse karo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* LEFT: Declaration form */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-yellow-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="space-y-5">
            {/* Step 1: Game */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-blue-700 text-white text-sm font-bold flex items-center justify-center">1</span>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Select Game</label>
              </div>
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                data-testid="game-select"
                className="w-full bg-white border-2 border-blue-200 rounded-xl h-12 px-4 text-base font-bold text-blue-900 focus:outline-none focus:border-yellow-500"
              >
                {markets.length === 0 && <option>Loading...</option>}
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.open_time} → {m.close_time})</option>
                ))}
              </select>
              {selectedMarket && (
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  <span>Today: <strong className="text-blue-700">{selectedMarket.today_result || "—"}</strong></span>
                  <span>Yesterday: <strong className="text-slate-700">{selectedMarket.yesterday_result || "—"}</strong></span>
                </div>
              )}
            </div>

            {/* Step 2: Date */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-blue-700 text-white text-sm font-bold flex items-center justify-center">2</span>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Pick Date</label>
              </div>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="result-date-picker"
                className="w-full bg-white border-2 border-blue-200 rounded-xl h-12 px-4 text-base font-bold"
              />
            </div>

            {/* Step 3: Result */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-yellow-500 text-blue-900 text-sm font-bold flex items-center justify-center">3</span>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Enter Result (2-digit)</label>
              </div>
              <Input
                value={result}
                onChange={(e) => setResult(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="37"
                maxLength={2}
                data-testid="result-input"
                className="w-full bg-white border-2 border-yellow-400 rounded-xl h-20 px-4 text-center text-5xl font-black tracking-widest text-blue-900 focus:outline-none focus:border-yellow-600"
              />
              <div className="text-[11px] text-slate-500 mt-1 text-center">e.g., 37 — Andar = 3 (first digit), Bahar = 7 (second digit)</div>
            </div>

            {/* Step 4: Declare button */}
            <Button
              onClick={declareResult}
              disabled={declaring || !marketId || !result}
              data-testid="declare-btn"
              className="w-full h-14 bg-gradient-to-br from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-yellow-400 font-black text-lg rounded-xl shadow-xl disabled:opacity-50"
            >
              <Trophy className="w-5 h-5 mr-2" /> {declaring ? "Declaring..." : `Declare Result ${result || ""}`}
            </Button>

            {/* Last declaration result */}
            {lastDeclare && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4" data-testid="last-declare-banner">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold text-emerald-900">
                      Result declared: <span className="text-2xl">{lastDeclare.result}</span> for {lastDeclare.market}
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">
                      {lastDeclare.settled} bids settled · {lastDeclare.won} winners · ₹{lastDeclare.payout_total} paid
                    </div>
                    <Button
                      onClick={() => reverseResult()}
                      disabled={reversing}
                      data-testid="last-reverse-btn"
                      variant="outline"
                      className="mt-3 h-9 text-xs border-rose-300 text-rose-600 hover:bg-rose-50"
                    >
                      <Undo2 className="w-3.5 h-3.5 mr-1" /> {reversing ? "Reversing..." : "Reverse this result (refund winners)"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Recent History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-700" />
              <h3 className="font-display font-bold text-lg text-blue-900">Recent Results</h3>
            </div>
            {selectedMarket && <Link to={`/admin/jantri?market=${marketId}`} className="text-xs font-semibold text-yellow-600 hover:underline flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Jantri</Link>}
          </div>
          <div className="text-xs text-slate-500 mb-3">{selectedMarket?.name || "Select a game"}</div>
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-200 rounded-xl">No results declared yet</div>
            ) : (
              history.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3" data-testid={`history-row-${r.date}`}>
                  <div>
                    <div className="text-xs text-slate-500">{r.date}</div>
                    <div className="font-display font-black text-2xl text-blue-900 mt-0.5">{r.result}</div>
                  </div>
                  <Button
                    onClick={() => reverseResult(r.date)}
                    disabled={reversing}
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] border-rose-200 text-rose-600 hover:bg-rose-50"
                    data-testid={`history-reverse-${r.date}`}
                  >
                    <Undo2 className="w-3 h-3 mr-1" /> Reverse
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-[11px] text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Wrong result?</strong> Reverse karte hi sare jeete hue users ke wallet se winnings auto-debit ho jaayengi aur bids pending par wapas chale jayenge. Phir sahi result daal sakte ho.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
