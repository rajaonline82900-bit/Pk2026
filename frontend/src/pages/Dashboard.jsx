import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import {
  ArrowUpRight, BarChart3, Play,
  BookOpen, Wallet as WalletIcon, ArrowDownToLine, Youtube, Trophy, Zap, Sparkles, Gem, TrendingUp
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
      {/* Hero — Jade Ledger glass card */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-5 mb-4 jl-fade-up" style={{ animationDelay: "40ms" }} data-testid="hero-banner">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-jade-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-champagne-500/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-champagne-500" />
              <span className="text-[10px] uppercase tracking-[0.2em] luxury-gradient-text font-bold">Jade Ledger</span>
            </div>
            <div className="font-serif font-bold text-3xl leading-tight luxury-gradient-text">Aaj Lucky banoge?</div>
            <div className="text-sm text-[color:var(--jl-text-muted)] mt-1.5 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${liveCount > 0 ? "bg-jade-400 animate-pulse" : "bg-[color:var(--jl-text-muted)]"}`} />
              <span>{liveCount > 0 ? `${liveCount} markets LIVE` : "Markets open soon"}</span>
            </div>
          </div>
          <div className="text-center">
            <Trophy className="w-14 h-14 text-champagne-500 drop-shadow-[0_0_20px_rgba(229,197,135,0.35)]" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* 4 Brand Action Buttons — Deposit / Withdrawal / Telegram / WhatsApp */}
      <div className="grid grid-cols-4 gap-3 mb-4 jl-fade-up" style={{ animationDelay: "120ms" }} data-testid="quick-actions">
        <BrandAction to="/deposit" label="Deposit" testid="action-deposit" bg="from-jade-400 via-jade-500 to-jade-600" ring="ring-jade-400/50">
          <DepositIcon />
        </BrandAction>
        <BrandAction to="/withdraw" label="Withdrawal" testid="action-withdraw" bg="from-rose-400 via-rose-500 to-rose-600" ring="ring-rose-400/40">
          <WithdrawalIcon />
        </BrandAction>
        <BrandAction href={tg} label="Telegram" testid="action-telegram" bg="from-[#2AABEE] via-[#229ED9] to-[#1E96CC]" ring="ring-sky-400/40">
          <TelegramIcon />
        </BrandAction>
        <BrandAction href={`https://wa.me/${wa.replace(/\D/g, "")}`} label="WhatsApp" testid="action-whatsapp" bg="from-[#25D366] via-[#1FBE5C] to-[#128C7E]" ring="ring-emerald-400/40">
          <WhatsAppIcon />
        </BrandAction>
      </div>

      {/* How to Play — Champagne pill */}
      <button onClick={() => setHowOpen(true)} data-testid="how-to-play-btn" className="block w-full btn-champagne text-center font-serif font-bold text-xl py-3 rounded-2xl shadow-xl mb-4 tactile-btn jl-fade-up" style={{ animationDelay: "180ms" }}>
        <span className="flex items-center justify-center gap-2">
          <Youtube className="w-6 h-6" /> HOW TO PLAY
        </span>
      </button>

      {/* Fast Result — obsidian glass strip */}
      <div className="mb-3 jl-fade-up" style={{ animationDelay: "240ms" }} data-testid="fast-result-header">
        <div className="glass-panel text-center py-3 rounded-2xl relative overflow-hidden">
          <span className="relative flex items-center justify-center gap-2 font-serif font-bold text-lg">
            <Zap className="w-5 h-5 text-champagne-500" fill="currentColor" />
            <span className="luxury-gradient-text">FAST RESULT</span>
            <Zap className="w-5 h-5 text-champagne-500" fill="currentColor" />
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-obsidian-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3" data-testid="market-list">
          {markets.map((m, i) => (
            <div key={m.id} className="jl-fade-up" style={{ animationDelay: `${300 + i * 60}ms` }}>
              <MarketCard m={m} onChart={() => setHistoryMarket(m)} />
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-[color:var(--jl-text-muted)] mt-8 mb-2 flex items-center justify-center gap-1.5">
        <Gem className="w-3 h-3 text-jade-400" />
        <span>M11 CLUBE · Play Responsibly</span>
        <Gem className="w-3 h-3 text-jade-400" />
      </div>

      {/* How to Play Sheet — Dark theme */}
      <Sheet open={howOpen} onOpenChange={setHowOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] bg-obsidian-900 border-t border-[color:var(--jl-border)] text-[color:var(--jl-text)]">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 btn-champagne px-4 py-1.5 rounded-full text-xs font-bold mb-2 tactile-btn">
              <Youtube className="w-4 h-4" /> TUTORIALS
            </div>
            <div className="font-serif font-bold text-2xl luxury-gradient-text">How to use M11 CLUBE</div>
            <div className="text-xs text-[color:var(--jl-text-muted)] mt-1">Choose a topic to watch the tutorial</div>
          </div>
          <div className="space-y-3">
            <HowOption Icon={BookOpen}        label="How to Play"     desc="Game rules, betting basics"  url={settings.youtube_how_to_play}     color="from-jade-400 to-jade-600" testid="how-play" />
            <HowOption Icon={WalletIcon}      label="How to Deposit"  desc="Add money to your wallet"    url={settings.youtube_how_to_deposit}  color="from-champagne-400 to-champagne-600" testid="how-deposit" />
            <HowOption Icon={ArrowDownToLine} label="How to Withdraw" desc="Withdraw your winnings"      url={settings.youtube_how_to_withdraw} color="from-sky-400 to-blue-600" testid="how-withdraw" />
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
    <button onClick={handle} data-testid={testid} className="w-full flex items-center gap-3 glass-panel glass-panel-hover rounded-2xl p-3 tactile-btn text-left">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} text-obsidian-900 flex items-center justify-center shadow-lg`}>
        <Icon className="w-7 h-7" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-serif font-bold text-lg">{label}</div>
        <div className="text-xs text-[color:var(--jl-text-muted)] mt-0.5">{desc}</div>
      </div>
      {url ? <Youtube className="w-6 h-6 text-rose-400 shrink-0" /> : <span className="text-[9px] bg-obsidian-800 text-[color:var(--jl-text-muted)] px-2 py-1 rounded-full border border-[color:var(--jl-border)]">SOON</span>}
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
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-obsidian-900 border-t border-[color:var(--jl-border)] text-[color:var(--jl-text)]">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 glass-panel text-jade-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" /> Result History
          </div>
          <div className="font-serif font-bold text-2xl luxury-gradient-text mt-2" data-testid="history-market-name">{market?.name}</div>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-obsidian-800 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2" data-testid="history-grid">
            {(data?.history || []).map((row, i) => (
              <div key={i} className="glass-panel rounded-xl p-2 flex items-center justify-between">
                <div className="text-xs text-[color:var(--jl-text-muted)] font-medium">{row.date}</div>
                <div className="btn-champagne font-money font-black text-xl px-3 py-1 rounded-lg tabular-nums shadow">{row.result}</div>
              </div>
            ))}
            {(!data || data.history.length === 0) && <div className="col-span-2 text-center text-[color:var(--jl-text-muted)] text-sm py-6">No history yet — wait for results</div>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BrandAction({ to, href, label, children, bg, ring, testid }) {
  const inner = (
    <div className="flex flex-col items-center gap-1.5" data-testid={testid}>
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${bg} text-white flex items-center justify-center shadow-xl tactile-btn ring-2 ${ring} ring-offset-2 ring-offset-obsidian-900`}>
        {children}
      </div>
      <span className="text-[11px] font-bold text-[color:var(--jl-text)]">{label}</span>
    </div>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
  return <Link to={to}>{inner}</Link>;
}

/* Branded SVG icons — match real-world look */
function DepositIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="14" fill="#fff">₹</text>
      <g transform="translate(22,6)">
        <circle r="6" fill="#EED9A8" stroke="#fff" strokeWidth="1.5" />
        <path d="M0 -3 V3 M-3 0 H3" stroke="#040906" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
function WithdrawalIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <text x="16" y="20" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="14" fill="#fff">₹</text>
      <g transform="translate(22,6)">
        <circle r="6" fill="#EED9A8" stroke="#fff" strokeWidth="1.5" />
        <path d="M0 -3 V3 M-3 0 L0 3 L3 0" stroke="#040906" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg viewBox="0 0 240 240" className="w-8 h-8" aria-hidden="true">
      <path fill="#fff" d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687c1.906 0 30.255-29.492 30.255-29.492l31.525-60.89-79.448 37.225z" opacity="0.95"/>
      <path fill="#fff" d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0c8.899-8.9 17.417-15.764 17.417-15.764"/>
      <path fill="#fff" d="M81.486 130.179L52.2 120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229 2.1-2.2 6.489-4.523 120.106-45.36 120.106-45.36s3.208-1.081 5.1-.362a2.766 2.766 0 0 1 1.885 2.055c.133.726.187 1.46.165 2.193-.008.633-.084 1.219-.142 2.138-.572 9.21-17.554 77.503-17.554 77.503s-1.016 4-4.66 4.135a6.654 6.654 0 0 1-4.825-1.878c-7.116-6.122-31.71-22.65-37.149-26.285a1.55 1.55 0 0 1-.668-1.103c-.075-.575.55-1.288.55-1.288s42.815-38.05 43.957-42.044c.088-.31-.244-.46-.69-.326-2.836.844-52.085 32.05-57.508 35.486a2.7 2.7 0 0 1-1.62.064z"/>
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
      <path fill="#fff" d="M16.003 3.2c-7.066 0-12.8 5.733-12.8 12.8 0 2.255.59 4.45 1.71 6.387L3.2 28.8l6.585-1.713a12.78 12.78 0 0 0 6.218 1.585c7.066 0 12.8-5.734 12.8-12.8 0-3.42-1.332-6.638-3.752-9.057A12.722 12.722 0 0 0 16.003 3.2zm0 23.36a10.5 10.5 0 0 1-5.354-1.466l-.384-.227-3.905 1.017 1.04-3.806-.25-.394A10.55 10.55 0 0 1 5.44 16c0-5.83 4.733-10.56 10.563-10.56 2.823 0 5.475 1.099 7.47 3.094a10.5 10.5 0 0 1 3.093 7.466c0 5.83-4.733 10.56-10.563 10.56zm5.79-7.91c-.318-.16-1.878-.927-2.169-1.033-.29-.106-.502-.16-.715.16-.212.318-.82 1.033-1.005 1.246-.185.212-.37.238-.688.08-.318-.16-1.34-.494-2.553-1.575-.943-.84-1.58-1.878-1.766-2.196-.185-.318-.02-.49.139-.648.143-.142.318-.37.477-.555.16-.185.212-.318.318-.53.107-.212.053-.398-.026-.557-.08-.16-.715-1.726-.98-2.366-.259-.625-.522-.54-.715-.55l-.609-.012a1.171 1.171 0 0 0-.847.398c-.29.318-1.112 1.086-1.112 2.65 0 1.564 1.138 3.075 1.297 3.288.16.212 2.241 3.42 5.43 4.798.76.328 1.353.523 1.815.67.762.243 1.456.208 2.005.126.611-.092 1.878-.768 2.143-1.51.265-.74.265-1.378.185-1.51-.08-.132-.291-.212-.61-.371z"/>
    </svg>
  );
}

function MarketCard({ m, onChart }) {
  const playable = m.is_market_active;
  const today = m.today_result || "**";
  const yesterday = m.yesterday_result || "**";
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl overflow-hidden transition" data-testid={`market-card-${m.id}`}>
      {/* Top row: Chart icon + Market name */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <button onClick={onChart} data-testid={`market-chart-${m.id}`} className="active:scale-90 transition shrink-0" aria-label="Result history">
          <div className="w-11 h-11 rounded-xl bg-obsidian-700 border border-jade-500/30 text-jade-400 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-5 h-5" strokeWidth={2} />
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-serif font-bold text-[color:var(--jl-text)] text-xl leading-tight" data-testid="market-name">{m.name}</div>
          <button onClick={onChart} className="text-[10px] text-champagne-500 font-bold mt-0.5 flex items-center gap-0.5" data-testid={`view-chart-${m.id}`}>
            <TrendingUp className="w-2.5 h-2.5" /> VIEW CHART
          </button>
        </div>
      </div>

      {/* Bottom row: Old / arrow / New + Play */}
      <div className="flex items-center justify-between px-3 pb-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="text-center">
            <div className="bg-obsidian-700 border border-[color:var(--jl-border)] text-[color:var(--jl-text-muted)] font-money font-black text-lg w-14 h-10 flex items-center justify-center rounded-lg leading-none tabular-nums" data-testid="market-old">{yesterday}</div>
            <div className="text-[9px] text-[color:var(--jl-text-muted)] mt-0.5 font-bold tracking-widest">OLD</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-jade-400" />
          <div className="text-center">
            <div className={`${today !== "**" ? "btn-champagne text-obsidian-900" : "bg-obsidian-700 border border-[color:var(--jl-border)] text-[color:var(--jl-text-muted)]"} font-money font-black text-lg w-14 h-10 flex items-center justify-center rounded-lg leading-none shadow-md tabular-nums`} data-testid="market-new">{today}</div>
            <div className="text-[9px] text-[color:var(--jl-text-muted)] mt-0.5 font-bold tracking-widest">NEW</div>
          </div>
        </div>

        {playable ? (
          <Link to={`/market/${m.id}`} data-testid={`play-btn-${m.id}`} className="btn-jade text-sm font-black rounded-xl inline-flex items-center justify-center gap-1.5 h-11 px-5 tactile-btn shadow-lg">
            <span className="flex items-center gap-1.5">PLAY <Play className="w-4 h-4 fill-current" /></span>
          </Link>
        ) : (
          <span data-testid={`timeout-btn-${m.id}`} className="bg-obsidian-700 border border-[color:var(--jl-border)] text-[color:var(--jl-text-muted)] text-xs font-black rounded-xl inline-flex items-center justify-center gap-1 h-11 px-4">
            TIME OUT
          </span>
        )}
      </div>

      {/* Footer times */}
      <div className="bg-obsidian-900/50 border-t border-[color:var(--jl-border)] text-[color:var(--jl-text-muted)] text-center text-xs font-medium py-2 flex items-center justify-center gap-3">
        <span className="text-jade-400 font-bold">OPEN</span>
        <span className="tabular-nums font-money">{format12(m.open_time)}</span>
        <span className="text-champagne-500">·</span>
        <span className="text-champagne-500 font-bold">CLOSE</span>
        <span className="tabular-nums font-money">{format12(m.close_time)}</span>
      </div>
    </div>
  );
}
