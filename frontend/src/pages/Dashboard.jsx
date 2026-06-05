import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import {
  Megaphone, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Send,
} from "lucide-react";

const WhatsAppGlyph = (props) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M19.11 17.46c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15s-.78.98-.95 1.18c-.18.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.78-1.68-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.68-1.65-.94-2.26-.25-.6-.5-.52-.68-.53l-.58-.01c-.2 0-.53.08-.81.38-.28.3-1.07 1.05-1.07 2.55s1.1 2.96 1.25 3.16c.15.2 2.17 3.31 5.26 4.65.74.32 1.31.51 1.76.66.74.24 1.41.21 1.94.13.59-.09 1.78-.73 2.04-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35zm-5.39 7.34h-.01c-1.83 0-3.62-.49-5.18-1.42l-.37-.22-3.85 1.01 1.03-3.75-.24-.39A10.66 10.66 0 1 1 24.4 8.36 10.6 10.6 0 0 1 13.72 24.8zm9.06-19.74A12.92 12.92 0 0 0 13.72 1.92 12.94 12.94 0 0 0 2.4 21.07L.51 28.08l7.17-1.88a12.91 12.91 0 0 0 6.04 1.54h.01a12.94 12.94 0 0 0 12.93-12.94c0-3.45-1.34-6.7-3.78-9.14z" />
  </svg>
);

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
      <PosterCarousel posters={settings.posters || []} />
      <QuickIcons settings={settings} />

      <div className="bg-amber-50 border border-amber-200 rounded-xl py-2 overflow-hidden mb-4" data-testid="scrolling-notice">
        <div className="marquee-track text-sm text-amber-900 font-medium px-2">
          <Megaphone className="inline w-3.5 h-3.5 mr-2 -mt-0.5" />
          {settings.notice_text || "Welcome to M11 CLUBE"}
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
            <button key={i} onClick={() => setIdx(i)} className={`h-2 rounded-full transition-all ${i === idx ? "bg-white w-6" : "bg-white/60 w-2"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuickIcons({ settings }) {
  const wa = (settings.whatsapp_number || "+919999999999").replace(/[^\d+]/g, "");
  const tg = settings.telegram_url || "https://t.me/m11clube";
  const items = [
    { to: "/deposit", label: "Deposit", icon: ArrowDownToLine, color: "bg-emerald-500", testid: "quick-deposit" },
    { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine, color: "bg-rose-500", testid: "quick-withdraw" },
    { href: tg, label: "Telegram", icon: Send, color: "bg-sky-500", testid: "quick-telegram" },
    { href: `https://wa.me/${wa.replace(/\D/g, "")}`, label: "WhatsApp", icon: WhatsAppGlyph, color: "bg-[#25D366]", testid: "quick-whatsapp" },
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
    <Link to={`/market/${m.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-orange-200 transition" data-testid={`market-card-${m.id}`}>
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
          Open: <span className="text-slate-700 font-medium">{m.open_time}</span> · Close: <span className="text-slate-700 font-medium">{m.close_time}</span>
        </div>
        {playable ? (
          <span data-testid={`play-btn-${m.id}`} className="btn-brand px-4 py-2 rounded-lg text-sm">Play Game</span>
        ) : (
          <span data-testid={`closed-btn-${m.id}`} className="px-4 py-2 rounded-lg text-sm bg-slate-100 text-slate-400 font-medium">Closed For Today</span>
        )}
      </div>
    </Link>
  );
}
