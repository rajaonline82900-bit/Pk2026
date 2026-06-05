import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { Trash2, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function GameScreen() {
  const { id, gameKey } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [market, setMarket] = useState(null);
  const [game, setGame] = useState(null);
  const [session, setSession] = useState("open");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [number2, setNumber2] = useState(""); // for sangam
  const [slip, setSlip] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/markets/${id}`), api.get("/games")]).then(([m, g]) => {
      setMarket(m.data);
      const found = g.data.find((x) => x.key === gameKey);
      setGame(found);
      if (found && !found.session) setSession(null);
      if (found && found.session && !m.data.is_open_session_active) setSession("close");
    });
  }, [id, gameKey]);

  const inputType = game?.input;
  const expectedLen = useMemo(() => {
    if (!game) return 0;
    if (game.input === "digit") return 1;
    if (game.input === "jodi") return 2;
    if (game.input === "pana") return 3;
    if (game.input === "sangam_half_a") return 1; // digit
    if (game.input === "sangam_half_b") return 3; // pana
    if (game.input === "sangam_full") return 3;   // pana
    return 0;
  }, [game]);

  const validate = () => {
    if (!number || !amount) return "Enter both number and amount";
    if (parseInt(amount) < 10) return "Min amount is 10";
    if (game.session && !session) return "Select Open or Close session";
    if (inputType === "digit" && !/^[0-9]$/.test(number)) return "Enter a single digit (0-9)";
    if (inputType === "jodi" && !/^[0-9]{2}$/.test(number)) return "Enter 2 digits (00-99)";
    if (inputType === "pana" && !/^[0-9]{3}$/.test(number)) return "Enter 3-digit pana";
    if (inputType === "sangam_half_a") {
      if (!/^[0-9]$/.test(number)) return "Open digit must be 1 digit";
      if (!/^[0-9]{3}$/.test(number2)) return "Close pana must be 3 digits";
    }
    if (inputType === "sangam_half_b") {
      if (!/^[0-9]{3}$/.test(number)) return "Open pana must be 3 digits";
      if (!/^[0-9]$/.test(number2)) return "Close digit must be 1 digit";
    }
    if (inputType === "sangam_full") {
      if (!/^[0-9]{3}$/.test(number)) return "Open pana must be 3 digits";
      if (!/^[0-9]{3}$/.test(number2)) return "Close pana must be 3 digits";
    }
    return null;
  };

  const addToSlip = () => {
    const err = validate();
    if (err) return toast.error(err);
    let display = number;
    let backendNumber = number;
    if (inputType === "sangam_half_a") { display = `${number}-${number2}`; backendNumber = `${number}-${number2}`; }
    if (inputType === "sangam_half_b") { display = `${number}-${number2}`; backendNumber = `${number}-${number2}`; }
    if (inputType === "sangam_full")   { display = `${number}-${number2}`; backendNumber = `${number}-${number2}`; }
    setSlip((s) => [...s, {
      id: crypto.randomUUID(),
      game_type: game.key,
      session: game.session ? session : null,
      number: backendNumber,
      display,
      amount: parseInt(amount),
    }]);
    setNumber(""); setNumber2(""); setAmount("");
  };

  const total = slip.reduce((s, b) => s + b.amount, 0);

  const submitBids = async () => {
    if (slip.length === 0) return toast.error("Add at least one bid");
    if (total > (user?.wallet_balance || 0)) return toast.error("Insufficient balance");
    setSubmitting(true);
    try {
      await api.post("/bids", {
        market_id: id,
        bids: slip.map(({ game_type, session, number, amount }) => ({ game_type, session, number, amount })),
      });
      toast.success(`Placed ${slip.length} bids · ${total} pts debited`);
      setSlip([]);
      await refreshUser();
      setTimeout(() => navigate("/my-bids"), 600);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSubmitting(false); }
  };

  if (!market || !game) return <MobileLayout><div>Loading…</div></MobileLayout>;

  const isMulti = ["sangam_half_a", "sangam_half_b", "sangam_full"].includes(inputType);

  return (
    <MobileLayout>
      <Toaster richColors position="top-center" />

      {/* Spacer so content isn't hidden by sticky bar */}
      <div className={slip.length > 0 ? "pb-24" : ""}>
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="text-[11px] uppercase tracking-widest text-slate-400">Market</div>
        <div className="font-display font-bold text-base text-slate-900">{market.name}</div>
        <div className="mt-2 text-[11px] uppercase tracking-widest text-slate-400">Game</div>
        <div className="font-display font-semibold text-slate-900" data-testid="game-screen-name">{game.name}</div>
        <div className="mt-2 inline-flex items-center gap-2 text-xs">
          <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5 font-semibold">Rate 1× → {game.rate}×</span>
          <span className="bg-slate-50 text-slate-600 border border-slate-200 rounded-md px-2 py-0.5">{game.input}</span>
        </div>
      </div>

      {game.session && (
        <div className="mb-4">
          <Label className="text-xs uppercase tracking-wider text-slate-600 block mb-2">Session</Label>
          <ToggleGroup type="single" value={session} onValueChange={(v) => v && setSession(v)} className="grid grid-cols-2 gap-2" data-testid="session-toggle">
            <ToggleGroupItem value="open" disabled={!market.is_open_session_active}
              className="data-[state=on]:bg-[#FF7A00] data-[state=on]:text-white border border-slate-200 rounded-lg h-10" data-testid="session-open">
              Open {!market.is_open_session_active && "(Closed)"}
            </ToggleGroupItem>
            <ToggleGroupItem value="close" disabled={!market.is_close_session_active}
              className="data-[state=on]:bg-[#FF7A00] data-[state=on]:text-white border border-slate-200 rounded-lg h-10" data-testid="session-close">
              Close {!market.is_close_session_active && "(Closed)"}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <Label className="text-xs uppercase tracking-wider text-slate-600">
          {inputType === "digit" ? "Digit (0-9)" : inputType === "jodi" ? "Jodi (00-99)" : inputType === "pana" ? "Pana (3 digits)" : inputType === "sangam_half_a" ? "Open Digit" : inputType === "sangam_half_b" ? "Open Pana" : inputType === "sangam_full" ? "Open Pana" : "Number"}
        </Label>
        <Input data-testid="bid-number-input" inputMode="numeric" maxLength={expectedLen}
          value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
          className="mt-1.5 h-11 tracking-widest text-center text-lg font-semibold" placeholder={"0".repeat(expectedLen)} />

        {isMulti && (
          <>
            <Label className="text-xs uppercase tracking-wider text-slate-600 mt-3 block">
              {inputType === "sangam_half_a" ? "Close Pana (3 digits)" : inputType === "sangam_half_b" ? "Close Digit" : "Close Pana (3 digits)"}
            </Label>
            <Input data-testid="bid-number2-input" inputMode="numeric"
              maxLength={inputType === "sangam_half_b" ? 1 : 3}
              value={number2} onChange={(e) => setNumber2(e.target.value.replace(/\D/g, ""))}
              className="mt-1.5 h-11 tracking-widest text-center text-lg font-semibold" />
          </>
        )}

        <Label className="text-xs uppercase tracking-wider text-slate-600 mt-3 block">Amount (points)</Label>
        <Input data-testid="bid-amount-input" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          className="mt-1.5 h-11" placeholder="Min 10" />

        <Button data-testid="add-to-slip-btn" onClick={addToSlip} className="w-full mt-4 btn-brand h-11">
          <Plus className="w-4 h-4 mr-1.5" /> Add to Bet Slip
        </Button>
      </div>

      {slip.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4" data-testid="bet-slip">
          <div className="flex items-center justify-between mb-2">
            <div className="font-display font-semibold text-slate-900">Bet Slip <span className="text-slate-400 font-normal text-sm">({slip.length})</span></div>
            <div className="text-sm font-semibold tabular-nums text-[#FF7A00]" data-testid="slip-total">{total} pts</div>
          </div>
          <div className="space-y-2">
            {slip.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-slate-100 last:border-0 py-2" data-testid={`slip-item-${b.id}`}>
                <div>
                  <div className="font-medium text-slate-900">{b.display} {b.session && <span className="text-[10px] uppercase tracking-widest text-slate-400 ml-1">{b.session}</span>}</div>
                  <div className="text-xs text-slate-500">{game.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="tabular-nums font-semibold">{b.amount}</div>
                  <button onClick={() => setSlip((s) => s.filter((x) => x.id !== b.id))} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md" data-testid={`remove-${b.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Sticky bottom Place Bids bar (always visible when slip has items) */}
      {slip.length > 0 && (
        <div className="fixed left-0 right-0 bottom-14 z-50 max-w-md mx-auto px-4 pb-2 pointer-events-none" data-testid="sticky-place-bids">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 p-3 flex items-center justify-between gap-3 pointer-events-auto">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">Total ({slip.length} bids)</div>
              <div className="font-display font-bold text-xl tabular-nums" data-testid="sticky-total">{total} pts</div>
            </div>
            <Button data-testid="submit-bids-btn" onClick={submitBids} disabled={submitting} className="btn-brand h-11 px-6 font-semibold">
              {submitting ? "Placing…" : `Place ${slip.length} ${slip.length === 1 ? "Bid" : "Bids"}`}
            </Button>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
