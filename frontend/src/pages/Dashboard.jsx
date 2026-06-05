import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import {
  Crown, Sparkles, Megaphone, TrendingUp,
  ArrowDownToLine, ArrowUpFromLine, Send, MessageCircle
} from "lucide-react";

function timeStr(t) { return t || "--:--"; }
function format12(t) {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")} ${ap}`;
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

  return (
    <MobileLayout>
      {/* Posters carousel */}
      <PosterCarousel posters={settings.posters || []} />

      {/* Quick action round icons */}
      <QuickIcons settings={settings} />

      {/* Notice marquee */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl py-2 overflow-hidden mb-3" data-testid="scrolling-notice">
        <div className="marquee-track text-sm text-amber-900 font-medium px-2">
          <Megaphone className="inline w-3.5 h-3.5 mr-2 -mt-0.5" />
          {settings.notice_text || "Welcome to M11 CLUBE"}
        </div>
      </div>

      {/* Quick games */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4" data-testid="quick-king-starline">
          <div className="flex items-center gap-2 text-amber-700"><Crown className="w-4 h-4" /><span className="text-[11px] uppercase tracking-widest font-semibold">King Starline</span></div>
          <div className="mt-2 font-display text-base font-semibold text-slate-900 leading-tight">Hourly Markets</div>
          <div className="text-xs text-slate-500 mt-0.5">Coming soon</div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4" data-testid="quick-king-jackpot">
          <div className="flex items-center gap-2 text-amber-300"><Sparkles className="w-4 h-4" /><span className="text-[11px] uppercase tracking-widest font-semibold">King Jackpot</span></div>
          <div className="mt-2 font-display text-base font-semibold leading-tight">Mega Prizes</div>
          <div className="text-xs text-white/70 mt-0.5">Coming soon</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-semibold text-slate-900 text-lg">Markets</h2>
        <div className="text-xs text-slate-400 inline-flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Live</div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({length: 5}).map((_,i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3" data-testid="market-list">
          {markets.map((m) => <MarketCard key={m.id} m={m} />)}
        </div>
      )}
    </MobileLayout>
  );
}

function PosterCarousel({ posters }) {
  const [idx, setIdx] = useState(0);
  const list = (posters || []).filter(p => p?.image_url);
  const ref = useRef(null);

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 4000);
    return () => clearInterval(t);
  }, [list.length]);

  if (list.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 bg-slate-100 aspect-[16/8]" data-testid="poster-carousel" ref={ref}>
      {list.map((p, i) => (
        <a key={i} href={p.link || "#"} target="_blank" rel="noreferrer"
          className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          data-testid={`poster-${i}`}>
          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
        </a>
      ))}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {list.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full transition ${i === idx ? "bg-white w-6" : "bg-white/50"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickIcons({ settings }) {
  const wa = (settings.whatsapp_number || "+919999999999").replace(/\D/g, "");
  const tg = settings.telegram_url || "https://t.me/m11clube";
  const items = [
    { to: "/funds", label: "Deposit", icon: ArrowDownToLine, color: "bg-emerald-500", testid: "quick-deposit" },
    { to: "/funds", label: "Withdraw", icon: ArrowUpFromLine, color: "bg-rose-500", testid: "quick-withdraw" },
    { href: tg, label: "Telegram", icon: Send, color: "bg-sky-500", testid: "quick-telegram" },
    { href: `https://wa.me/${wa}`, label: "WhatsApp", icon: MessageCircle, color: "bg-emerald-600", testid: "quick-whatsapp" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 mb-3" data-testid="quick-icons">
      {items.map((it) => {
        const Icon = it.icon;
        const inner = (
          <div className="flex flex-col items-center gap-1">
            <div className={`w-12 h-12 rounded-full ${it.color} text-white flex items-center justify-center shadow-md shadow-slate-900/10 hover:scale-105 active:scale-95 transition-transform`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-slate-700">{it.label}</span>
          </div>
        );
        if (it.href) {
          return <a key={it.label} href={it.href} target="_blank" rel="noreferrer" data-testid={it.testid}>{inner}</a>;
        }
        return <Link key={it.label} to={it.to} data-testid={it.testid}>{inner}</Link>;
      })}
    </div>
  );
}

function MarketCard({ m }) {
  const playable = m.is_market_active;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition" data-testid={`market-card-${m.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-display font-bold text-slate-900 text-base tracking-tight" data-testid="market-name">{m.name}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{format12(m.open_time)} → {format12(m.close_time)}</div>
        </div>
        <div className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md font-semibold ${playable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`} data-testid="market-status">
          {playable ? "Active" : "Closed"}
        </div>
      </div>

      <div className="text-center py-2 mb-3 bg-slate-50 border border-slate-100 rounded-lg">
        <div className="result-digits text-2xl text-[#FF7A00]" data-testid="market-result">{m.live_result}</div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">
          Open: <span className="text-slate-700 font-medium">{timeStr(m.open_time)}</span> · Close: <span className="text-slate-700 font-medium">{timeStr(m.close_time)}</span>
        </div>
        {playable ? (
          <Link to={`/market/${m.id}`} data-testid={`play-btn-${m.id}`} className="btn-brand px-4 py-2 rounded-lg text-sm">Play Game</Link>
        ) : (
          <button data-testid={`closed-btn-${m.id}`} disabled className="px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-400 cursor-not-allowed font-medium">Closed For Today</button>
        )}
      </div>
    </div>
  );
}
