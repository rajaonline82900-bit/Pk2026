import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import {
  ArrowUpRight, BarChart3, IndianRupee, Plus, MessageCircle, Send, Play,
  BookOpen, Wallet as WalletIcon, ArrowDownToLine, Youtube, Trophy, Zap, Sparkles, Crown, TrendingUp
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
  const liveCount = markets.filter(m => m.is_market_active).length;

  return (
    <MobileLayout>
      {/* Hero Welcome Banner with crown + animated gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-royal-radial p-4 mb-4 shadow-xl" data-testid="hero-banner">
        <div className="absolute inset-0 pattern-grid opacity-40" />
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] uppercase tracking-widest text-yellow-400 font-bold">Royal Edition</span>
            </div>
            <div className="font-display font-black text-2xl text-white leading-tight">Aaj Lucky banoge?</div>
            <div className="text-sm text-blue-100 mt-1">{liveCount > 0 ? `${liveCount} markets LIVE` : "Markets open soon"}</div>
          </div>
          <div className="text-center">
            <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* 4 Glassy Action Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4" data-testid="quick-actions">
        <ActionBtn to="/withdraw" label="Withdraw" Icon={IndianRupee} bg="from-rose-500 via-pink-500 to-rose-600" testid="action-withdraw" />
        <ActionBtn to="/deposit" label="Add Money" Icon={Plus} bg="from-emerald-500 via-green-500 to-emerald-600" testid="action-deposit" />
        <ActionBtn href={`https://wa.me/${wa.replace(/\D/g, "")}`} label="Help" Icon={MessageCircle} bg="from-[#25D366] via-green-500 to-emerald-600" testid="action-help" />
        <ActionBtn href={tg} label="Telegram" Icon={Send} bg="from-sky-500 via-blue-500 to-indigo-600" testid="action-telegram" />
      </div>

      {/* How to Play - Gold banner */}
      <button onClick={() => setHowOpen(true)} data-testid="how-to-play-btn" className="block w-full bg-gold-gradient text-blue-900 text-center font-display font-black text-xl py-3 rounded-2xl shadow-xl mb-3 active:scale-[0.98] transition btn-shine relative overflow-hidden">
        <span className="relative flex items-center justify-center gap-2">
          <Youtube className="w-6 h-6" /> HOW TO PLAY
        </span>
      </button>

      {/* Live Result header — Royal style */}
      <div className="flex items-center gap-2 mb-3" data-testid="fast-result-header">
        <div className="flex-1 bg-royal-radial text-white text-center font-display font-black text-lg py-3 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-30" />
          <span className="relative flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
            <span className="text-gold-shine">FAST RESULT</span>
            <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3" data-testid="market-list">
          {markets.map((m) => <MarketCard key={m.id} m={m} onChart={() => setHistoryMarket(m)} />)}
        </div>
      )}

      <div className="text-center text-xs text-slate-400 mt-6 mb-2 flex items-center justify-center gap-1">
        <Crown className="w-3 h-3 text-yellow-500" />
        <span>Powered by M11 CLUBE · Play Responsibly</span>
        <Crown className="w-3 h-3 text-yellow-500" />
      </div>

      {/* How to Play Sheet */}
      <Sheet open={howOpen} onOpenChange={setHowOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] bg-gradient-to-br from-blue-50 to-white">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-gold-gradient text-blue-900 px-4 py-1.5 rounded-full text-xs font-bold mb-2">
              <Youtube className="w-4 h-4" /> TUTORIALS
            </div>
            <div className="font-display font-black text-2xl text-blue-900">How to use M11 CLUBE</div>
            <div className="text-xs text-slate-600 mt-1">Choose a topic to watch the tutorial</div>
          </div>
          <div className="space-y-3">
            <HowOption Icon={BookOpen}        label="How to Play"     desc="Game rules, betting basics"  url={settings.youtube_how_to_play}     color="from-rose-500 to-pink-600" testid="how-play" />
            <HowOption Icon={WalletIcon}      label="How to Deposit"  desc="Add money to your wallet"    url={settings.youtube_how_to_deposit}  color="from-emerald-500 to-teal-600" testid="how-deposit" />
            <HowOption Icon={ArrowDownToLine} label="How to Withdraw" desc="Withdraw your winnings"      url={settings.youtube_how_to_withdraw} color="from-blue-500 to-indigo-600" testid="how-withdraw" />
          </div>
        </SheetContent>
      </Sheet>

      <ResultHistorySheet market={historyMarket} onClose={() => setHistoryMarket(null)} />
    </MobileLayout>
  );
}

function HowOption({ Icon, label, desc, url, color, testid }) {
  const handle = () => { if (url) window.open(url, "_blank", "noopener,noreferrer"); };
  return (
    <button onClick={handle} data-testid={testid} className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 hover:shadow-lg hover:border-yellow-300 active:scale-[0.98] transition text-left">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-slate-900 text-base">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
      {url ? <Youtube className="w-6 h-6 text-rose-500 shrink-0" /> : <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">SOON</span>}
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
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 bg-royal-radial text-yellow-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" /> Result History
          </div>
          <div className="font-display font-black text-2xl text-blue-900 mt-2" data-testid="history-market-name">{market?.name}</div>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2" data-testid="history-grid">
            {(data?.history || []).map((row, i) => (
              <div key={i} className="bg-white border border-blue-100 rounded-xl p-2 flex items-center justify-between shadow-sm">
                <div className="text-xs text-slate-500 font-medium">{row.date}</div>
                <div className="bg-gold-gradient text-blue-900 font-black text-xl px-3 py-1 rounded-lg tabular-nums shadow">{row.result}</div>
              </div>
            ))}
            {(!data || data.history.length === 0) && <div className="col-span-2 text-center text-slate-400 text-sm py-6">No history yet — wait for results</div>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionBtn({ to, href, label, Icon, bg, testid }) {
  const inner = (
    <div className="flex flex-col items-center gap-1" data-testid={testid}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${bg} text-white flex items-center justify-center shadow-xl active:scale-95 transition-transform btn-shine`}>
        <Icon className="w-6 h-6" strokeWidth={2.5} />
      </div>
      <span className="text-[11px] font-bold text-blue-900">{label}</span>
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
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition" data-testid={`market-card-${m.id}`}>
      {/* Top row: Chart icon + FULL market name */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <button onClick={onChart} data-testid={`market-chart-${m.id}`} className="active:scale-90 transition shrink-0" aria-label="Result history">
          <div className="w-11 h-11 rounded-xl bg-royal-radial text-yellow-400 flex items-center justify-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 pattern-grid opacity-30" />
            <BarChart3 className="w-5 h-5 relative" strokeWidth={2.5} />
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-blue-900 text-lg leading-tight" data-testid="market-name">{m.name}</div>
          <button onClick={onChart} className="text-[10px] text-yellow-600 font-bold mt-0.5 flex items-center gap-0.5" data-testid={`view-chart-${m.id}`}>
            <TrendingUp className="w-2.5 h-2.5" /> VIEW CHART
          </button>
        </div>
      </div>

      {/* Bottom row: Old / arrow / New + Play button */}
      <div className="flex items-center justify-between px-3 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-yellow-400 font-black text-lg w-14 h-10 flex items-center justify-center rounded-lg leading-none shadow-md tabular-nums" data-testid="market-old">{yesterday}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-bold tracking-widest">OLD</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-yellow-500" />
          <div className="text-center">
            <div className={`${playable && today !== "**" ? "bg-gold-gradient text-blue-900 pulse-gold" : (today !== "**" ? "bg-gold-gradient text-blue-900" : "bg-gradient-to-br from-slate-300 to-slate-400 text-white")} font-black text-lg w-14 h-10 flex items-center justify-center rounded-lg leading-none shadow-md tabular-nums`} data-testid="market-new">{today}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 font-bold tracking-widest">NEW</div>
          </div>
        </div>

        {playable ? (
          <Link to={`/market/${m.id}`} data-testid={`play-btn-${m.id}`} className="bg-royal-radial text-yellow-400 text-sm font-black rounded-xl inline-flex items-center justify-center gap-1.5 h-11 px-5 active:scale-95 transition shadow-lg btn-shine relative overflow-hidden">
            <span className="relative flex items-center gap-1.5">PLAY <Play className="w-4 h-4 fill-yellow-400" /></span>
          </Link>
        ) : (
          <span data-testid={`timeout-btn-${m.id}`} className="bg-gradient-to-br from-rose-500 to-red-700 text-white text-xs font-black rounded-xl inline-flex items-center justify-center gap-1 h-11 px-4 shadow-md">
            ⏰ TIME OUT
          </span>
        )}
      </div>

      {/* Gold accent footer with times */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white text-center text-xs font-bold py-2 flex items-center justify-center gap-3 relative">
        <div className="h-0.5 absolute top-0 left-0 right-0 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        <span className="text-yellow-400">OPEN</span>
        <span className="tabular-nums">{format12(m.open_time)}</span>
        <span className="text-yellow-400">·</span>
        <span className="text-yellow-400">CLOSE</span>
        <span className="tabular-nums">{format12(m.close_time)}</span>
      </div>
    </div>
  );
}
