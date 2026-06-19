import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import {
  ArrowUpRight, BarChart3, IndianRupee, Plus, MessageCircle, Send, Play, X, BookOpen, Wallet as WalletIcon, ArrowDownToLine, Youtube
} from "lucide-react";
import { Sheet, SheetContent } from "../components/ui/sheet";

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
  const [howOpen, setHowOpen] = useState(false);
  const [historyMarket, setHistoryMarket] = useState(null);

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
        <ActionBtn to="/withdraw" label="Withdraw" Icon={IndianRupee} bg="bg-gradient-to-br from-rose-500 to-pink-600" testid="action-withdraw" labelColor="text-rose-600" />
        <ActionBtn to="/deposit" label="Add Money" Icon={Plus} bg="bg-gradient-to-br from-[#0f7a6a] to-emerald-600" testid="action-deposit" labelColor="text-emerald-700" />
        <ActionBtn href={`https://wa.me/${wa.replace(/\D/g, "")}`} label="Help" Icon={MessageCircle} bg="bg-gradient-to-br from-[#25D366] to-emerald-600" testid="action-help" labelColor="text-emerald-700" />
        <ActionBtn href={tg} label="Telegram" Icon={Send} bg="bg-gradient-to-br from-sky-500 to-blue-600" testid="action-telegram" labelColor="text-sky-700" />
      </div>

      {/* How to Play banner (opens modal) */}
      <button onClick={() => setHowOpen(true)} className="block w-full bg-gradient-to-r from-[#FF7A00] to-orange-500 text-white text-center font-display font-bold text-xl py-3 rounded-lg shadow mb-3 active:scale-[0.98] transition" data-testid="how-to-play-btn">
        How to Play
      </button>

      {/* Fast Result header */}
      <div className="bg-gradient-to-r from-[#0f7a6a] to-emerald-600 text-white text-center font-display font-bold text-xl py-3 rounded-lg mb-3 shadow" data-testid="fast-result-header">
        Fast Result
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3" data-testid="market-list">
          {markets.map((m) => <MarketCard key={m.id} m={m} onChart={() => setHistoryMarket(m)} />)}
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-6 mb-2">Powered by M11 CLUBE · Play Responsibly</div>

      {/* How to Play Sheet */}
      <Sheet open={howOpen} onOpenChange={setHowOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh]">
          <div className="text-center mb-4">
            <div className="font-display font-bold text-xl text-slate-900">How to Play M11 CLUBE</div>
            <div className="text-xs text-slate-500 mt-1">Choose a topic to watch the tutorial video</div>
          </div>
          <div className="space-y-3">
            <HowOption Icon={BookOpen}      label="How to Play"     desc="Game rules, betting basics"     url={settings.youtube_how_to_play}     color="from-rose-500 to-orange-500"  testid="how-play" />
            <HowOption Icon={WalletIcon}    label="How to Deposit"  desc="Add money to your wallet"        url={settings.youtube_how_to_deposit}  color="from-emerald-500 to-[#0f7a6a]" testid="how-deposit" />
            <HowOption Icon={ArrowDownToLine} label="How to Withdraw" desc="Withdraw your winnings"           url={settings.youtube_how_to_withdraw} color="from-sky-500 to-blue-600"      testid="how-withdraw" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Result History Sheet */}
      <ResultHistorySheet market={historyMarket} onClose={() => setHistoryMarket(null)} />
    </MobileLayout>
  );
}

function HowOption({ Icon, label, desc, url, color, testid }) {
  const handle = () => {
    if (!url) {
      // No URL set yet — admin needs to configure
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <button onClick={handle} data-testid={testid} className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:shadow active:scale-[0.98] transition text-left">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      {url ? <Youtube className="w-5 h-5 text-rose-500" /> : <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">Coming soon</span>}
    </button>
  );
}

function ResultHistorySheet({ market, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!market) { setData(null); return; }
    setLoading(true);
    api.get(`/markets/${market.id}/result-history?limit=30`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [market]);
  return (
    <Sheet open={!!market} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-3">
          <div className="text-xs uppercase text-slate-500">Result History</div>
          <div className="font-display font-bold text-xl text-[#0f7a6a]" data-testid="history-market-name">{market?.name}</div>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2" data-testid="history-grid">
            {(data?.history || []).map((row, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                <div className="text-xs text-slate-500">{row.date}</div>
                <div className="bg-[#0f7a6a] text-white font-bold text-xl px-3 py-1 rounded-md tabular-nums">{row.result}</div>
              </div>
            ))}
            {(!data || data.history.length === 0) && <div className="col-span-2 text-center text-slate-400 text-sm py-6">No history yet</div>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionBtn({ to, href, label, Icon, bg, testid, labelColor }) {
  const inner = (
    <div className="flex flex-col items-center gap-1" data-testid={testid}>
      <div className={`w-14 h-14 rounded-full ${bg} text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform`}>
        <Icon className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <span className={`text-[11px] font-semibold ${labelColor}`}>{label}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
  return <Link to={to}>{inner}</Link>;
}

function MarketCard({ m, onChart }) {
  const playable = m.is_market_active;
  const today = m.today_result || "**";
  const yesterday = m.yesterday_result || "**";
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" data-testid={`market-card-${m.id}`}>
      <div className="flex items-center px-3 py-3 gap-2">
        <button onClick={onChart} data-testid={`market-chart-${m.id}`} className="shrink-0 active:scale-90 transition" aria-label="Result history">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0f7a6a] to-emerald-500 text-white flex items-center justify-center shadow">
            <BarChart3 className="w-5 h-5" strokeWidth={2.5} />
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-slate-900 text-base leading-tight" data-testid="market-name">{m.name}</div>
          <button onClick={onChart} className="text-[10px] text-[#0f7a6a] font-semibold mt-0.5" data-testid={`view-chart-${m.id}`}>VIEW CHART →</button>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-center">
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold text-lg w-12 h-10 flex items-center justify-center rounded-md leading-none shadow" data-testid="market-old">{yesterday}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-semibold">OLD</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
          <div className="text-center">
            <div className="bg-gradient-to-br from-[#0f7a6a] to-emerald-500 text-white font-bold text-lg w-12 h-10 flex items-center justify-center rounded-md leading-none shadow" data-testid="market-new">{today}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-semibold">NEW</div>
          </div>
        </div>
        {playable ? (
          <Link to={`/market/${m.id}`} data-testid={`play-btn-${m.id}`} className="bg-gradient-to-br from-emerald-500 to-green-600 text-white text-sm font-bold px-3 py-2 rounded-md inline-flex items-center gap-1 active:scale-95 transition shadow">
            PLAY <Play className="w-3.5 h-3.5 fill-white" />
          </Link>
        ) : (
          <span data-testid={`timeout-btn-${m.id}`} className="bg-gradient-to-br from-rose-500 to-red-600 text-white text-xs font-bold px-3 py-2 rounded-md shadow">⏰ TIME OUT</span>
        )}
      </div>
      <div className="bg-gradient-to-r from-[#0f7a6a] to-emerald-600 text-white text-center text-xs font-semibold py-1.5 flex items-center justify-center gap-4">
        <span>OPEN: {format12(m.open_time)}</span>
        <span className="opacity-60">·</span>
        <span>CLOSE: {format12(m.close_time)}</span>
      </div>
    </div>
  );
}
