import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { MessageCircle, Phone, ShieldCheck, FileVideo, Megaphone, BarChart3, Lightbulb, Share2, Settings as SettingsIcon, Headphones } from "lucide-react";

export function SupportPage() {
  const [settings, setSettings] = useState({});
  useEffect(() => { api.get("/settings").then(({data}) => setSettings(data)); }, []);
  const wa = (settings.whatsapp_number || "+919999999999").replace(/\D/g, "");
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Support</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-3 text-center">
        <Headphones className="w-12 h-12 mx-auto text-[#FF7A00] mb-3" />
        <div className="font-display font-semibold text-slate-900">24×7 Customer Care</div>
        <div className="text-sm text-slate-500 mt-1">Our team is here to assist you anytime.</div>
      </div>
      <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" data-testid="support-whatsapp" className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition rounded-xl p-4 mb-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
        <div>
          <div className="font-semibold text-emerald-900">WhatsApp Support</div>
          <div className="text-xs text-emerald-700">{settings.whatsapp_number || "+91 9999999999"}</div>
        </div>
      </a>
      <a href={`tel:${wa}`} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4" data-testid="support-call">
        <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Phone className="w-5 h-5" /></div>
        <div>
          <div className="font-semibold text-slate-900">Call Support</div>
          <div className="text-xs text-slate-500">Tap to call</div>
        </div>
      </a>
    </MobileLayout>
  );
}

export function NoticePage() {
  const [settings, setSettings] = useState({});
  useEffect(() => { api.get("/settings").then(({data}) => setSettings(data)); }, []);
  const rules = [
    "Players must be 18 years or older to participate.",
    "All bids are final once submitted to the bet slip and confirmed.",
    "Results are declared at the official close time as per market schedule.",
    "Winnings are credited to wallet automatically after result declaration.",
    "Minimum deposit is 100 points; minimum withdrawal is 500 points.",
    "Deposits and withdrawals are processed by admin within 30 minutes.",
    "Use of multiple accounts is strictly prohibited and will result in a ban.",
    "Play responsibly — set limits and never bid more than you can afford to lose.",
  ];
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Notice Board & Rules</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 flex gap-3">
        <Megaphone className="w-5 h-5 text-amber-700 shrink-0" />
        <div className="text-sm text-amber-900">{settings.notice_text}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="font-display font-semibold text-slate-900 mb-2">Game Rules</div>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
          {rules.map((r, i) => <li key={i}>{r}</li>)}
        </ol>
      </div>
    </MobileLayout>
  );
}

export function RatesPage() {
  const [games, setGames] = useState([]);
  useEffect(() => { api.get("/games").then(({data}) => setGames(data)); }, []);
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Game Rates</h1>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="rates-table">
        {games.map((g, i) => (
          <div key={g.key} className={`flex items-center justify-between px-4 py-3 ${i !== games.length - 1 ? "border-b border-slate-100" : ""}`}>
            <div className="text-sm text-slate-900">{g.name}</div>
            <div className="text-sm font-display font-semibold text-[#FF7A00] tabular-nums">1× → {g.rate}×</div>
          </div>
        ))}
      </div>
    </MobileLayout>
  );
}

export function ChartsPage() {
  const [markets, setMarkets] = useState([]);
  useEffect(() => { api.get("/markets").then(({data}) => setMarkets(data)); }, []);
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Charts</h1>
      <div className="space-y-2">
        {markets.map(m => (
          <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4" data-testid={`chart-${m.id}`}>
            <div className="font-display font-semibold text-slate-900">{m.name}</div>
            <div className="result-digits text-xl text-[#FF7A00] mt-2">{m.live_result}</div>
            <div className="text-[11px] text-slate-400 mt-1">Today's declared result</div>
          </div>
        ))}
      </div>
    </MobileLayout>
  );
}

export function TutorialsPage() {
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Video Tutorials</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
        <FileVideo className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <div className="font-medium text-slate-900">Tutorials coming soon</div>
        <div className="text-xs text-slate-500 mt-1">Step-by-step guides for every game type.</div>
      </div>
    </MobileLayout>
  );
}

export function IdeaPage() {
  const [text, setText] = useState("");
  const send = () => {
    if (text.length < 10) return alert("Please describe your idea (min 10 chars)");
    alert("Thanks for your suggestion!");
    setText("");
  };
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Submit an Idea</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <Lightbulb className="w-6 h-6 text-amber-500 mb-2" />
        <textarea data-testid="idea-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#FF7A00] focus:outline-none" placeholder="Share your ideas to improve M11 CLUBE…" />
        <button data-testid="idea-submit" onClick={send} className="w-full btn-brand h-11 rounded-lg mt-3">Submit</button>
      </div>
    </MobileLayout>
  );
}

export function SettingsPage() {
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Settings</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <SettingsIcon className="w-6 h-6 text-slate-500 mb-2" />
        <div className="text-sm text-slate-700">More preferences coming soon. For MPIN changes use the MPIN Management screen.</div>
      </div>
    </MobileLayout>
  );
}

export function SharePage() {
  const link = window.location.origin;
  const copy = async () => {
    await navigator.clipboard.writeText(`Play Matka on M11 CLUBE — get ₹50 welcome bonus! ${link}`);
    alert("Invite copied!");
  };
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Share App</h1>
      <div className="bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white rounded-2xl p-5">
        <Share2 className="w-10 h-10 mb-3" />
        <div className="font-display font-bold text-xl tracking-tight">Refer & Earn</div>
        <div className="text-sm opacity-90 mt-1">Share M11 CLUBE with friends and earn rewards on every signup.</div>
        <button data-testid="share-copy" onClick={copy} className="mt-4 bg-white text-[#FF7A00] font-semibold px-4 py-2.5 rounded-lg w-full">Copy Invite Link</button>
      </div>
    </MobileLayout>
  );
}
