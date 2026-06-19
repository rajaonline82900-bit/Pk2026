import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileLayout from "../../components/layout/MobileLayout";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { toast } from "sonner";
import { Trash2, ChevronLeft } from "lucide-react";

// Jodi Bet: 00-99 grid. User enters bet amount per number. Multiple numbers, different amounts.
export default function JodiBetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [market, setMarket] = useState(null);
  // bets: { "37": 50, "12": 100 ... }
  const [bets, setBets] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get(`/markets/${id}`).then(m => setMarket(m.data)); }, [id]);

  const total = useMemo(() => Object.values(bets).reduce((s, v) => s + (Number(v) || 0), 0), [bets]);
  const numCount = useMemo(() => Object.keys(bets).filter(k => Number(bets[k]) > 0).length, [bets]);

  const numbers = useMemo(() => Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0")), []);

  function setBet(num, val) {
    const n = Math.max(0, Number(val) || 0);
    setBets(prev => {
      const next = { ...prev };
      if (n > 0) next[num] = n; else delete next[num];
      return next;
    });
  }

  async function submit() {
    if (!market?.is_market_active) return toast.error("Market is closed");
    if (total <= 0) return toast.error("Bet amount enter karo");
    if (total > (user?.wallet_balance || 0)) return toast.error("Insufficient wallet balance");

    const payload = {
      market_id: market.id,
      bids: Object.entries(bets)
        .filter(([_, v]) => Number(v) > 0)
        .map(([num, amt]) => ({ game_type: "jodi", session: null, number: num, amount: Number(amt) })),
    };
    try {
      setSubmitting(true);
      await api.post("/bids", payload);
      await refresh();
      toast.success(`✅ ${payload.bids.length} jodi bet place ho gayi (Total ₹${total})`);
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

      <div className="bg-[#0f7a6a] text-white rounded-xl p-3 mb-3 flex items-center justify-between" data-testid="jodi-header">
        <div>
          <div className="text-xs opacity-80">Jodi Bet — {market?.name || ""}</div>
          <div className="text-xs opacity-80">Rate: ₹10 → ₹1000 (1:100)</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] opacity-80">Wallet</div>
          <div className="text-lg font-bold">{user?.wallet_balance ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-24" data-testid="jodi-grid">
        {numbers.map(n => (
          <div key={n} className={`border rounded-md p-1.5 ${bets[n] > 0 ? "border-[#0f7a6a] bg-emerald-50" : "border-slate-200 bg-white"}`}>
            <div className="text-center font-bold text-slate-900 text-sm leading-none mb-1" data-testid={`jodi-num-${n}`}>{n}</div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="₹0"
              value={bets[n] || ""}
              onChange={(e) => setBet(n, e.target.value)}
              data-testid={`jodi-input-${n}`}
              className="w-full text-center text-xs border border-slate-300 rounded px-1 py-1 focus:outline-none focus:border-[#0f7a6a]"
            />
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-3 z-50 shadow-lg">
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="text-slate-600">Numbers: <strong className="text-slate-900" data-testid="jodi-num-count">{numCount}</strong></div>
          <div className="text-slate-600">Total: <strong className="text-[#0f7a6a]" data-testid="jodi-total">₹{total}</strong></div>
          <button onClick={() => setBets({})} className="text-rose-500 text-xs inline-flex items-center gap-1" data-testid="jodi-clear">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
        <button
          onClick={submit}
          disabled={submitting || total <= 0 || !market?.is_market_active}
          data-testid="jodi-submit"
          className="w-full bg-[#0f7a6a] text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-[0.98] transition"
        >
          {submitting ? "Placing..." : `Place Jodi Bet (₹${total})`}
        </button>
      </div>
    </MobileLayout>
  );
}
