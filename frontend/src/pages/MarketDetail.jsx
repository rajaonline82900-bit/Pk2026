import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { Dice5, Hash, Shuffle, Clock, ChevronRight, BarChart3, TrendingUp } from "lucide-react";
import { Sheet, SheetContent } from "../components/ui/sheet";

const GAME_TYPES = [
  { key: "jodi",       label: "Jodi Bet",  desc: "00 – 99 par bet, ₹10 = ₹1000", Icon: Dice5,   color: "bg-gradient-to-br from-orange-500 to-rose-500" },
  { key: "haruf",      label: "Haruf",     desc: "Andar / Bahar — ₹100 = ₹1000",  Icon: Hash,    color: "bg-gradient-to-br from-[#0f7a6a] to-emerald-600" },
  { key: "cross_bet",  label: "Cross Bet", desc: "Multi-digit Jodi — ₹10 = ₹1000", Icon: Shuffle, color: "bg-gradient-to-br from-violet-500 to-purple-600" },
];

export default function MarketDetail() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/markets/${id}`).then((m) => setMarket(m.data));
  }, [id]);

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      const { data } = await api.get(`/markets/${id}/result-history?limit=30`);
      setHistory(data.history || []);
    } catch (e) { setHistory([]); }
  };

  if (!market) {
    return <MobileLayout><div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}</div></MobileLayout>;
  }

  return (
    <MobileLayout>
      {/* Market header */}
      <div className="bg-[#0f7a6a] text-white rounded-xl p-5 mb-4 shadow" data-testid="market-detail-header">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">Market</div>
            <div className="font-display font-bold text-2xl tracking-tight mt-1" data-testid="market-detail-name">{market.name}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs opacity-90">
              <Clock className="w-3.5 h-3.5" /> {market.open_time} → {market.close_time}
            </div>
          </div>
          <button onClick={openHistory} data-testid="market-history-btn" className="bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl p-3 active:scale-90 transition shadow">
            <BarChart3 className="w-6 h-6 text-yellow-300" />
            <div className="text-[10px] font-bold text-yellow-300 mt-0.5">CHART</div>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="text-center">
            <div className="text-[10px] opacity-70 uppercase">Today</div>
            <div className="bg-white text-[#0f7a6a] font-bold text-2xl w-16 h-12 flex items-center justify-center rounded-md leading-none mt-0.5" data-testid="market-detail-today">{market.today_result || "**"}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] opacity-70 uppercase">Yesterday</div>
            <div className="bg-rose-500 text-white font-bold text-2xl w-16 h-12 flex items-center justify-center rounded-md leading-none mt-0.5" data-testid="market-detail-yesterday">{market.yesterday_result || "**"}</div>
          </div>
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Select Game</div>

      <div className="space-y-3" data-testid="game-list">
        {GAME_TYPES.map((g) => (
          <Link
            key={g.key}
            to={`/market/${id}/game/${g.key}`}
            data-testid={`game-${g.key}`}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-[#0f7a6a]/30 active:scale-[0.98] transition"
          >
            <div className={`w-14 h-14 rounded-xl ${g.color} text-white flex items-center justify-center shrink-0 shadow`}>
              <g.Icon className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-slate-900 text-lg leading-tight">{g.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{g.desc}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        ))}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-900">
        <strong>Game Rates:</strong> Jodi 1:100 · Haruf 1:10 · Cross Bet 1:100 · Min bet ₹10
      </div>

      {/* Result History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center mb-3">
            <div className="inline-flex items-center gap-1.5 bg-blue-900 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <TrendingUp className="w-3 h-3" /> Result History
            </div>
            <div className="font-display font-black text-2xl text-blue-900 mt-2" data-testid="history-market-name">{market?.name}</div>
            <div className="text-xs text-slate-500 mt-1">Past results (last 30 days)</div>
          </div>
          <div className="grid grid-cols-2 gap-2" data-testid="history-grid">
            {history.length === 0 ? (
              <div className="col-span-2 text-center text-slate-400 text-sm py-6">No history yet — pehli baar result aane par yahaan dikhega</div>
            ) : history.map((row, i) => (
              <div key={i} className="bg-white border border-blue-100 rounded-xl p-2 flex items-center justify-between shadow-sm">
                <div className="text-xs text-slate-500 font-medium">{row.date}</div>
                <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-blue-900 font-black text-xl px-3 py-1 rounded-lg tabular-nums shadow">{row.result}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
