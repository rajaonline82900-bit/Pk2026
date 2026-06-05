import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { ChevronRight, Clock } from "lucide-react";

export default function MarketDetail() {
  const { id } = useParams();
  const [market, setMarket] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    Promise.all([api.get(`/markets/${id}`), api.get("/games")]).then(([m, g]) => {
      setMarket(m.data); setGames(g.data);
    });
  }, [id]);

  if (!market) {
    return <MobileLayout><div className="space-y-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}</div></MobileLayout>;
  }

  return (
    <MobileLayout>
      <div className="bg-slate-900 text-white rounded-2xl p-5 mb-4">
        <div className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold">Market</div>
        <div className="font-display font-bold text-2xl tracking-tight mt-1" data-testid="market-detail-name">{market.name}</div>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/80">
          <Clock className="w-3.5 h-3.5" /> {market.open_time} → {market.close_time}
        </div>
        <div className="mt-3 text-2xl result-digits text-amber-300" data-testid="market-detail-result">{market.live_result}</div>
      </div>

      <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Select Game</div>
      <div className="grid grid-cols-1 gap-2" data-testid="game-list">
        {games.map((g) => (
          <Link
            key={g.key}
            to={`/market/${id}/game/${g.key}`}
            data-testid={`game-${g.key}`}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-[#FF7A00] hover:shadow-sm transition"
          >
            <div>
              <div className="font-medium text-slate-900 text-sm">{g.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Rate: 1× → {g.rate}×</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </MobileLayout>
  );
}
