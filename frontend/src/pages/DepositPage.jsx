import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { IndianRupee, X, CheckCircle2, Loader2 } from "lucide-react";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 10000, 20000, 50000];

export default function DepositPage() {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null); // {order_id, payment_url, bhim_link, paytm_link, phonepe_link, amount}
  useEffect(() => { api.get("/settings").then(({data}) => setSettings(data)); }, []);

  const num = parseInt(amount) || 0;
  const min = settings.min_deposit ?? 100;

  const proceed = async () => {
    if (num < min) return toast.error(`⚠️ Minimum deposit ₹${min} hai. Aapne ₹${num} daala — kam se kam ₹${min} daalo.`);
    setLoading(true);
    try {
      const { data } = await api.post("/wallet/deposit/imb-create", { amount: num });
      setOrder(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const onPaymentDone = async () => {
    setOrder(null);
    setAmount("");
    await refreshUser();
  };

  return (
    <MobileLayout>
      <Toaster richColors position="top-center" />
      <div className="bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white rounded-2xl p-5 mb-4">
        <div className="text-[11px] uppercase tracking-widest opacity-80">Wallet Balance</div>
        <div className="font-display font-bold text-4xl tabular-nums mt-1" data-testid="wallet-balance-display">{user?.wallet_balance ?? 0}</div>
        <div className="text-xs opacity-80 mt-1">points</div>
      </div>

      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Add Funds</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="deposit-form">
        <Label className="text-xs uppercase tracking-wider text-slate-600">Select Amount</Label>
        <div className="grid grid-cols-4 gap-2 mt-1.5 mb-3" data-testid="quick-amounts">
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(String(a))} data-testid={`qa-${a}`}
              className={`text-sm font-semibold py-2 rounded-md border transition tabular-nums ${num === a ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200 hover:border-[#FF7A00] hover:text-[#FF7A00]"}`}>
              {a >= 1000 ? `${a/1000}K` : a}
            </button>
          ))}
        </div>
        <Label className="text-xs uppercase tracking-wider text-slate-600">Or enter custom amount</Label>
        <div className="relative mt-1.5">
          <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <Input data-testid="deposit-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="pl-9 h-11 text-base font-semibold" placeholder={`Minimum ${min}`} />
        </div>
        <Button data-testid="deposit-submit" onClick={proceed} disabled={loading || num < min} className="w-full mt-4 h-12 btn-brand text-base font-semibold disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {loading ? "Creating order…" : `Proceed to Pay ${num >= min ? `₹${num}` : ""}`}
        </Button>

        <div className="mt-3 relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 border border-rose-200 p-3.5" data-testid="screenshot-warning-pre">
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-rose-200/30 rounded-full blur-xl" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-amber-200/40 rounded-full blur-xl" />
          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
            </div>
            <div className="flex-1 text-[12.5px] text-slate-800 leading-relaxed" style={{ fontFamily: '"Noto Sans Devanagari", "DM Sans", system-ui, sans-serif' }}>
              <div className="font-bold text-rose-700 tracking-tight mb-0.5">⚠️ ज़रूरी सूचना</div>
              भुगतान करने के लिए <strong className="text-rose-700">हमेशा नया QR कोड जनरेट करें</strong>। स्कैनर का <strong>स्क्रीनशॉट लें</strong> और किसी भी ऐप का उपयोग करके भुगतान करें। भुगतान <strong className="text-emerald-700">स्वचालित रूप से आपके वॉलेट में जुड़ जाएगा</strong>।
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed text-center">
          Powered by IMB Payment Gateway · Secure & auto-credit
        </p>
      </div>

      {order && <ImbPaymentOverlay order={order} onDone={onPaymentDone} onClose={() => setOrder(null)} />}
    </MobileLayout>
  );
}

function ImbPaymentOverlay({ order, onDone, onClose }) {
  const [status, setStatus] = useState("waiting"); // waiting, completed, failed
  const [secondsLeft, setSecondsLeft] = useState(420); // 7-min payment window
  const pollRef = useRef(null);
  const closedRef = useRef(false);

  // Prevent accidental refresh / back nav
  useEffect(() => {
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBefore);
    window.history.pushState({ imb: true }, "");
    const onPop = () => {
      if (status === "waiting" && !closedRef.current) {
        window.history.pushState({ imb: true }, "");
        toast.warning("Use the Close (×) button to exit payment");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("beforeunload", onBefore);
      window.removeEventListener("popstate", onPop);
    };
  }, [status]);

  // Status polling every 4s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.post("/wallet/deposit/imb-status", { order_id: order.order_id });
        const txn = data.transaction;
        if (txn?.status === "approved") {
          setStatus("completed");
          clearInterval(pollRef.current);
          setTimeout(() => { closedRef.current = true; onDone(); toast.success("Deposit credited to wallet!"); }, 1800);
        } else if (txn?.status === "rejected") {
          setStatus("failed");
          clearInterval(pollRef.current);
        }
      } catch (e) { /* keep polling */ }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [order.order_id, onDone]);

  // Countdown
  useEffect(() => {
    if (status !== "waiting") return;
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (secondsLeft === 0 && status === "waiting") setStatus("failed");
  }, [secondsLeft, status]);

  const mmss = `${Math.floor(secondsLeft/60).toString().padStart(2,"0")}:${(secondsLeft%60).toString().padStart(2,"0")}`;

  const safeClose = () => {
    if (status === "waiting") {
      if (!window.confirm("Cancel this payment? If you've already paid, please wait — funds will auto-credit once verified.")) return;
    }
    closedRef.current = true;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 sm:bg-slate-950/85 sm:backdrop-blur-sm flex flex-col" data-testid="imb-overlay">
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">Pay {order.amount} via UPI</div>
          <div className="text-[11px] text-white/70 font-mono">Order {order.order_id}</div>
        </div>
        <div className="flex items-center gap-2">
          {status === "waiting" && <div className="text-xs tabular-nums bg-white/10 px-2 py-1 rounded-md font-semibold">{mmss}</div>}
          <button onClick={safeClose} className="p-1.5 rounded-md hover:bg-white/10 transition" data-testid="imb-close-btn"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {status === "completed" ? (
        <div className="flex-1 flex items-center justify-center bg-white p-8 text-center" data-testid="imb-success">
          <div>
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-3" />
            <div className="font-display font-bold text-2xl text-slate-900">Payment Successful</div>
            <div className="text-sm text-slate-500 mt-1">{order.amount} pts credited to your wallet</div>
          </div>
        </div>
      ) : status === "failed" ? (
        <div className="flex-1 flex items-center justify-center bg-white p-8 text-center" data-testid="imb-failed">
          <div>
            <X className="w-12 h-12 text-rose-500 mx-auto mb-3 bg-rose-50 rounded-full p-2" />
            <div className="font-display font-bold text-lg text-slate-900">Payment Not Completed</div>
            <div className="text-sm text-slate-500 mt-1">If you paid, contact support with order id.</div>
            <Button onClick={onClose} className="mt-4 btn-brand h-10 px-6">Close</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white overflow-y-auto" data-testid="imb-waiting">
          {/* IMPORTANT screenshot warning */}
          <div className="px-4 pt-3 pb-3 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 border-b-2 border-rose-200" data-testid="screenshot-warning">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-200 animate-pulse">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
              </div>
              <div className="text-[12.5px] text-slate-800 leading-relaxed" style={{ fontFamily: '"Noto Sans Devanagari", "DM Sans", system-ui, sans-serif' }}>
                <div className="font-bold text-rose-700 mb-0.5 tracking-tight">⚠️ ज़रूरी सूचना</div>
                भुगतान करने के लिए <strong className="text-rose-700">हमेशा नया QR कोड जनरेट करें</strong>। स्कैनर का <strong>स्क्रीनशॉट लें</strong> और किसी भी ऐप का उपयोग करके भुगतान करें। भुगतान <strong className="text-emerald-700">स्वचालित रूप से आपके वॉलेट में जुड़ जाएगा</strong>।
              </div>
            </div>
          </div>

          {/* Embedded IMB payment page — only this is visible during payment */}
          {order.payment_url ? (
            <iframe
              src={order.payment_url}
              title="IMB Payment"
              className="w-full"
              style={{ height: "calc(100vh - 180px)", border: 0 }}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
              data-testid="imb-iframe"
            />
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading payment scanner…
            </div>
          )}

          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-[11px] text-amber-900 text-center font-medium">
            Status auto-checking every 4s · Wallet credited automatically on success
          </div>
        </div>
      )}
    </div>
  );
}

function _UpiAppRemoved({ href, label, testid }) {
  return (
    <a href={href} className="text-center bg-slate-50 border border-slate-200 hover:border-[#FF7A00] hover:bg-orange-50 transition rounded-lg p-3 text-xs font-semibold text-slate-700"
      data-testid={testid}>
      <Smartphone className="w-5 h-5 mx-auto mb-1 text-[#FF7A00]" />
      {label}
    </a>
  );
}
