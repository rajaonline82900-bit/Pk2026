import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import {
  ChevronRight, Clock, Dice5, Boxes, Hash, Layers, Circle,
  Zap, Shuffle, Crown, Target, Grid3x3, Award, Diamond,
  Heart, Sparkles, Tag, Sigma, Group, Trophy, Coins
} from "lucide-react";

// Map each game key to an icon + accent color
const GAME_VISUALS = {
  single_digit:       { Icon: Hash,        color: "from-blue-500 to-blue-600" },
  single_digit_bulk:  { Icon: Boxes,       color: "from-blue-400 to-indigo-500" },
  jodi:               { Icon: Dice5,       color: "from-amber-500 to-orange-500" },
  jodi_bulk:          { Icon: Boxes,       color: "from-amber-400 to-orange-500" },
  single_pana:        { Icon: Layers,      color: "from-emerald-500 to-teal-600" },
  single_pana_bulk:   { Icon: Boxes,       color: "from-emerald-400 to-teal-500" },
  double_pana:        { Icon: Diamond,     color: "from-violet-500 to-purple-600" },
  double_pana_bulk:   { Icon: Boxes,       color: "from-violet-400 to-purple-500" },
  triple_pana:        { Icon: Crown,       color: "from-rose-500 to-pink-600" },
  penal_group:        { Icon: Group,       color: "from-cyan-500 to-blue-500" },
  red_brackets:       { Icon: Heart,       color: "from-red-500 to-rose-600" },
  sp_dp_tp:           { Icon: Grid3x3,     color: "from-fuchsia-500 to-pink-500" },
  choice_pana_spdp:   { Icon: Target,      color: "from-orange-500 to-red-500" },
  sp_motor:           { Icon: Zap,         color: "from-yellow-500 to-amber-600" },
  dp_motor:           { Icon: Zap,         color: "from-orange-600 to-red-700" },
  group_jodi:         { Icon: Group,       color: "from-teal-500 to-emerald-600" },
  digit_based_jodi:   { Icon: Sigma,       color: "from-indigo-500 to-blue-600" },
  odd_even:           { Icon: Shuffle,     color: "from-slate-600 to-slate-800" },
  two_digits_panel:   { Icon: Tag,         color: "from-lime-500 to-emerald-500" },
  half_sangam_a:      { Icon: Award,       color: "from-pink-500 to-rose-500" },
  half_sangam_b:      { Icon: Award,       color: "from-rose-500 to-fuchsia-500" },
  full_sangam:        { Icon: Trophy,      color: "from-amber-500 via-orange-500 to-rose-500" },
};

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
      <div className="grid grid-cols-2 gap-2.5" data-testid="game-list">
        {games.map((g) => {
          const vis = GAME_VISUALS[g.key] || { Icon: Coins, color: "from-slate-500 to-slate-700" };
          const Icon = vis.Icon;
          return (
            <Link
              key={g.key}
              to={`/market/${id}/game/${g.key}`}
              data-testid={`game-${g.key}`}
              className="group bg-white border border-slate-200 rounded-xl p-3 hover:border-[#FF7A00] hover:shadow-md transition flex flex-col items-center text-center"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${vis.color} text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="font-medium text-slate-900 text-[13px] leading-tight">{g.name}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">1× → {g.rate}×</div>
            </Link>
          );
        })}
      </div>
    </MobileLayout>
  );
}
