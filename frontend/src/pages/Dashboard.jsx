import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { ArrowUpRight, BarChart3, IndianRupee, Plus, MessageCircle, Send, Play } from "lucide-react";

function format12(t) {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ap}`;
}

export default function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/markets"), api.get("/settings")])
      .then(([m, s]) => { setMarkets(m.data); setSettings(s.data); })
      .finally(() => setLoading(false));
  }, []);

  const wa = (settings.whatsapp_number || "+919999999999").replace(/[^\d+]/g, "");
  const tg = settings.telegram_url || "https://t.me/m11clube";

  return (
    <MobileLayout>
      {/* 4 Circular Action Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4" data-testid="quick-actions">
        <ActionBtn to="/withdraw" label="Withdraw" Icon={IndianRupee} bg="bg-rose-500" testid="action-withdraw" />
        <ActionBtn to="/deposit" label="Add Money" Icon={Plus} bg="bg-[#0f7a6a]" testid="action-deposit" />
        <ActionBtn href={`https://wa.me/${wa.replace(/\D/g, "")}`} label="Help" Icon={MessageCircle} bg="bg-[#0f7a6a]" iconBg="bg-[#25D366]" testid="action-help" />
        <ActionBtn href={tg} label="Telegram" Icon={Send} bg="bg-[#0f7a6a]" testid="action-telegram" />
      </div>

      {/* How to Play banner */}
      <Link to="/support" className="block bg-[#FF7A00] text-white text-center font-display font-bold text-xl py-3 rounded-lg shadow mb-3" data-testid="how-to-play">
        How to Play
      </Link>

      {/* Fast Result header */}
      <div className="bg-[#0f7a6a] text-white text-center font-display font-bold text-xl py-3 rounded-lg mb-3" data-testid="fast-result-header">
        Fast Result
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3" data-testid="market-list">
          {markets.map((m) => <MarketCard key={m.id} m={m} />)}
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-6 mb-2">Powered by M11 CLUBE · Play Responsibly</div>
    </MobileLayout>
  );
}

function ActionBtn({ to, href, label, Icon, bg, iconBg, testid }) {
  const inner = (
    <div className="flex flex-col items-center gap-1" data-testid={testid}>
      <div className={`w-14 h-14 rounded-full ${iconBg || bg} text-white flex items-center justify-center shadow active:scale-95 transition-transform`}>
        <Icon className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <span className={`text-[11px] font-semibold ${label === "Withdraw" ? "text-rose-600" : "text-[#0f7a6a]"}`}>{label}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
  return <Link to={to}>{inner}</Link>;
}

function MarketCard({ m }) {
  const playable = m.is_market_active;
  const today = m.today_result || "**";
  const yesterday = m.yesterday_result || "**";
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" data-testid={`market-card-${m.id}`}>
      <div className="flex items-center px-3 py-3 gap-2">
        <BarChart3 className="w-9 h-9 text-[#0f7a6a] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-slate-900 text-base leading-tight" data-testid="market-name">{m.name}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-center">
            <div className="bg-rose-500 text-white font-bold text-lg w-12 h-10 flex items-center justify-center rounded-md leading-none" data-testid="market-old">{yesterday}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">Old</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
          <div className="text-center">
            <div className="bg-[#0f7a6a] text-white font-bold text-lg w-12 h-10 flex items-center justify-center rounded-md leading-none" data-testid="market-new">{today}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">New</div>
          </div>
        </div>
        {playable ? (
          <Link to={`/market/${m.id}`} data-testid={`play-btn-${m.id}`} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-3 py-2 rounded-md inline-flex items-center gap-1 active:scale-95 transition shadow">
            PLAY <Play className="w-3.5 h-3.5 fill-white" />
          </Link>
        ) : (
          <span data-testid={`closed-btn-${m.id}`} className="bg-slate-200 text-slate-500 text-xs font-semibold px-3 py-2 rounded-md">Closed</span>
        )}
      </div>
      <div className="bg-[#0f7a6a] text-white text-center text-xs font-semibold py-1.5 flex items-center justify-center gap-4">
        <span>OPEN: {format12(m.open_time)}</span>
        <span>CLOSE: {format12(m.close_time)}</span>
      </div>
    </div>
  );
}
