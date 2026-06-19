import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileLayout from "../../components/layout/MobileLayout";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { toast } from "sonner";
import { Trash2, ChevronLeft } from "lucide-react";

// Cross Bet: User selects multiple digits 0-9 and enters a single amount.
// Backend gets each generated jodi as an individual bid with game_type='cross_bet'.
// Includes pairs (11, 22, 33) and ordered cross combinations (12, 21, 13, 31, etc.)
// For selection [1,2,3], generates: 11, 12, 13, 21, 22, 23, 31, 32, 33 (9 jodis)
// Payout 1:100 — same as jodi (each generated jodi is a separate ₹X bet).
export default function CrossBetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [market, setMarket] = useState(null);
  const [selected, setSelected] = useState([]); // ["1","2","3"]
  const [amount, setAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get(`/markets/${id}`).then(m => setMarket(m.data)); }, [id]);

  // Auto-generated jodis: every ordered (a,b) pair including a==b → e.g. [1,2] → 11,12,21,22
  const generatedJodis = useMemo(() => {
    const out = [];
    for (const a of selected) {
      for (const b of selected) {
        out.push(`${a}${b}`);
      }
    }
    // de-dup (selected list already uniq, but safety)
    return Array.from(new Set(out));
  }, [selected]);

  const totalBet = useMemo(() => generatedJodis.length * (Number(amount) || 0), [generatedJodis, amount]);

  function toggle(d) {
    setSelected(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function submit() {
    if (!market?.is_market_active) return toast.error("Market is closed");
    if (generatedJodis.length === 0) return toast.error("Kam se kam ek digit select karo");
    if ((Number(amount) || 0) <= 0) return toast.error("Amount enter karo");
    if (totalBet > (user?.wallet_balance || 0)) return toast.error("Insufficient wallet balance");

    const bids = generatedJodis.map(j => ({
      game_type: "cross_bet",
      session: null,
      number: j,
      amount: Number(amount),
    }));

    try {
      setSubmitting(true);
      await api.post("/bids", { market_id: market.id, bids });
      await refresh();
      toast.success(`✅ ${bids.length} Cross bet place ho gayi (Total ₹${totalBet})`);
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

      <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl p-3 mb-3 flex items-center justify-between" data-testid="cross-header">
        <div>
          <div className="text-xs opacity-90">Cross Bet — {market?.name || ""}</div>
          <div className="text-xs opacity-90">Rate: ₹10 → ₹1000 (per jodi 1:100)</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] opacity-90">Wallet</div>
          <div className="text-lg font-bold">{user?.wallet_balance ?? 0}</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-900 mb-3">
        Multiple digits select karo (jaise 1, 2, 3) — sare combinations (11, 22, 33, 12, 13, 21, 23, 31, 32) automatic ban jaayenge. Pairs (11/22/33) bhi include hote hain.
      </div>

      {/* Digit selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3" data-testid="cross-digit-selector">
        <div className="text-xs font-semibold text-slate-700 mb-2">Select Digits</div>
        <div className="grid grid-cols-5 gap-2">
          {[0,1,2,3,4,5,6,7,8,9].map(d => {
            const active = selected.includes(String(d));
            return (
              <button
                key={d}
                onClick={() => toggle(String(d))}
                data-testid={`cross-digit-${d}`}
                className={`h-12 rounded-md font-bold text-lg transition active:scale-95 ${active ? "bg-violet-600 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount per jodi */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
        <div className="text-xs font-semibold text-slate-700 mb-2">Amount per jodi (₹)</div>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          min={10}
          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          data-testid="cross-amount-input"
          className="w-full text-center text-lg font-bold border border-slate-300 rounded-md py-2 focus:outline-none focus:border-violet-500"
        />
        <div className="flex gap-2 mt-2">
          {[10, 50, 100, 500].map(v => (
            <button key={v} onClick={() => setAmount(v)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-1.5 rounded" data-testid={`cross-amt-${v}`}>₹{v}</button>
          ))}
        </div>
      </div>

      {/* Generated preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 mb-28" data-testid="cross-preview">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-slate-700">Generated Jodis ({generatedJodis.length})</div>
          <button onClick={() => setSelected([])} className="text-rose-500 text-xs inline-flex items-center gap-1" data-testid="cross-clear">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
        {generatedJodis.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-6">Upar se digits select karo</div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {generatedJodis.map(j => (
              <span key={j} className="bg-violet-100 text-violet-800 text-sm font-bold text-center py-1.5 rounded">{j}</span>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 p-3 z-50 shadow-lg">
        <div className="flex items-center justify-between mb-2 text-sm">
          <div className="text-slate-600">Jodis: <strong className="text-slate-900" data-testid="cross-count">{generatedJodis.length}</strong></div>
          <div className="text-slate-600">Total: <strong className="text-violet-600" data-testid="cross-total">₹{totalBet}</strong></div>
        </div>
        <button
          onClick={submit}
          disabled={submitting || totalBet <= 0 || !market?.is_market_active}
          data-testid="cross-submit"
          className="w-full bg-violet-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 active:scale-[0.98] transition"
        >
          {submitting ? "Placing..." : `Place Cross Bet (₹${totalBet})`}
        </button>
      </div>
    </MobileLayout>
  );
}
