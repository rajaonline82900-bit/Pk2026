import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileLayout from "../../components/layout/MobileLayout";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { toast } from "sonner";
import { Trash2, ChevronLeft, ArrowLeftToLine, ArrowRightFromLine } from "lucide-react";

// Haruf: Bet on single digit 0-9.
// Andar = PEHLA (first) digit of result.    e.g. jodi "12" → Andar = 1
// Bahar = DOOSRA (second) digit of result.  e.g. jodi "12" → Bahar = 2
// Payout 1:10 (₹100 → ₹1000)
export default function HarufPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [market, setMarket] = useState(null);
  const [bets, setBets] = useState({ andar: {}, bahar: {} });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get(`/markets/${id}`).then(m => setMarket(m.data)); }, [id]);

  const total = useMemo(() => {
    const a = Object.values(bets.andar).reduce((s, v) => s + (Number(v) || 0), 0);
    const b = Object.values(bets.bahar).reduce((s, v) => s + (Number(v) || 0), 0);
    return a + b;
  }, [bets]);

  const numCount = useMemo(() => {
    return Object.values(bets.andar).filter(v => Number(v) > 0).length +
           Object.values(bets.bahar).filter(v => Number(v) > 0).length;
  }, [bets]);

  function setBet(side, digit, val) {
    const n = Math.max(0, Number(val) || 0);
    setBets(prev => {
      const next = { ...prev, [side]: { ...prev[side] } };
      if (n > 0) next[side][digit] = n; else delete next[side][digit];
      return next;
    });
  }

  async function submit() {
    if (!market?.is_market_active) return toast.error("Market is closed");
    if (total <= 0) return toast.error("Bet amount enter karo");
    if (total > (user?.wallet_balance || 0)) return toast.error("Insufficient wallet balance");

    const bids = [
      ...Object.entries(bets.andar).filter(([_, v]) => Number(v) > 0).map(([d, a]) => ({ game_type: "haruf_andar", session: null, number: d, amount: Number(a) })),
      ...Object.entries(bets.bahar).filter(([_, v]) => Number(v) > 0).map(([d, a]) => ({ game_type: "haruf_bahar", session: null, number: d, amount: Number(a) })),
    ];

    try {
      setSubmitting(true);
      await api.post("/bids", { market_id: market.id, bids });
      await refresh();
      toast.success(`✅ ${bids.length} Haruf bet place ho gayi (Total ₹${total})`);
      navigate("/my-bids");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bet placement failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileLayout hideBottomNav>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-600 mb-2" data-testid="back-btn">
        <ChevronLeft className="w-5 h-5" /> Back
      </button>

      <div className="bg-gradient-to-br from-[#0f7a6a] to-emerald-600 text-white rounded-xl p-3 mb-3 flex items-center justify-between shadow" data-testid="haruf-header">
        <div>
          <div className="text-xs opacity-90">Haruf — {market?.name || ""}</div>
          <div className="text-xs opacity-90">Rate: ₹100 → ₹1000 (1:10)</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] opacity-80">Wallet</div>
          <div className="text-lg font-bold">{user?.wallet_balance ?? 0}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 mb-3">
        Result <strong>12</strong> aaya toh: <strong>Andar = 1</strong> (pehla digit) · <strong>Bahar = 2</strong> (doosra digit)
      </div>

      {/* Andar (first digit / Open) - attractive purple */}
      <Section title="ANDAR" subtitle="Pehla digit (first digit of result)" Icon={ArrowLeftToLine} color="from-violet-500 to-purple-600">
        <div className="grid grid-cols-5 gap-2" data-testid="andar-grid">
          {[0,1,2,3,4,5,6,7,8,9].map(d => (
            <Cell
              key={`a-${d}`}
              digit={d}
              value={bets.andar[d] || ""}
              onChange={(v) => setBet("andar", d, v)}
              active={Number(bets.andar[d]) > 0}
              testid={`andar-${d}`}
              activeColor="border-violet-500 bg-violet-50"
            />
          ))}
        </div>
      </Section>

      {/* Bahar (second digit / Close) - attractive orange */}
      <Section title="BAHAR" subtitle="Doosra digit (second digit of result)" Icon={ArrowRightFromLine} color="from-orange-500 to-rose-600">
        <div className="grid grid-cols-5 gap-2 mb-24" data-testid="bahar-grid">
          {[0,1,2,3,4,5,6,7,8,9].map(d => (
            <Cell
              key={`b-${d}`}
              digit={d}
              value={bets.bahar[d] || ""}
              onChange={(v) => setBet("bahar", d, v)}
              active={Number(bets.bahar[d]) > 0}
              testid={`bahar-${d}`}
              activeColor="border-orange-500 bg-orange-50"
            />
          ))}
        </div>
      </Section>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-3 z-50 shadow-lg">
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="text-slate-600">Bets: <strong className="text-slate-900" data-testid="haruf-num-count">{numCount}</strong></div>
          <div className="text-slate-600">Total: <strong className="text-[#0f7a6a]" data-testid="haruf-total">₹{total}</strong></div>
          <button onClick={() => setBets({ andar: {}, bahar: {} })} className="text-rose-500 text-xs inline-flex items-center gap-1" data-testid="haruf-clear">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
        <button
          onClick={submit}
          disabled={submitting || total <= 0 || !market?.is_market_active}
          data-testid="haruf-submit"
          className="w-full bg-gradient-to-br from-[#0f7a6a] to-emerald-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-[0.98] transition shadow"
        >
          {submitting ? "Placing..." : `Place Haruf Bet (₹${total})`}
        </button>
      </div>
    </MobileLayout>
  );
}

function Section({ title, subtitle, Icon, color, children }) {
  return (
    <div className="mb-4">
      <div className={`bg-gradient-to-r ${color} text-white px-3 py-2.5 mb-2 rounded-lg shadow flex items-center gap-2`}>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display font-bold text-base leading-tight">{title}</div>
          <div className="text-[11px] opacity-90">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Cell({ digit, value, onChange, active, testid, activeColor }) {
  return (
    <div className={`border rounded-md p-1.5 ${active ? activeColor : "border-slate-200 bg-white"}`}>
      <div className="text-center font-bold text-slate-900 text-base leading-none mb-1">{digit}</div>
      <input
        type="number"
        inputMode="numeric"
        placeholder="₹0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="w-full text-center text-xs border border-slate-300 rounded px-1 py-1 focus:outline-none focus:border-[#0f7a6a]"
      />
    </div>
  );
}
