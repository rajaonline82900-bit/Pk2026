import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { Wallet, Copy, IndianRupee, Smartphone } from "lucide-react";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 10000, 20000, 50000];

export default function Funds() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState({});
  const [params, setParams] = useSearchParams();
  const initialTab = params.get("tab") === "withdraw" ? "withdraw" : "deposit";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => { api.get("/settings").then(({data}) => setSettings(data)); }, []);
  useEffect(() => { setParams({ tab }, { replace: true }); /* eslint-disable-line */ }, [tab]);

  return (
    <MobileLayout>
      <Toaster richColors position="top-center" />
      <div className="bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white rounded-2xl p-5 mb-4">
        <div className="text-[11px] uppercase tracking-widest opacity-80">Wallet Balance</div>
        <div className="font-display font-bold text-4xl tabular-nums mt-1" data-testid="wallet-balance-display">{user?.wallet_balance ?? 0}</div>
        <div className="text-xs opacity-80 mt-1">points</div>
      </div>

      <Tabs value={tab} onValueChange={setTab} data-testid="funds-tabs">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="deposit" data-testid="tab-deposit">Add Funds</TabsTrigger>
          <TabsTrigger value="withdraw" data-testid="tab-withdraw">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit">
          <DepositForm settings={settings} onDone={refreshUser} />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawForm settings={settings} onDone={refreshUser} />
        </TabsContent>
      </Tabs>
    </MobileLayout>
  );
}

function buildUpiUrl({ upi_id, payee, amount, note, app = "" }) {
  const params = new URLSearchParams({
    pa: upi_id,
    pn: payee || "M11 CLUBE",
    am: String(amount),
    cu: "INR",
    tn: note || "Deposit",
  });
  if (app === "paytm") return `paytmmp://pay?${params.toString()}`;
  if (app === "phonepe") return `phonepe://pay?${params.toString()}`;
  if (app === "gpay") return `tez://upi/pay?${params.toString()}`;
  if (app === "bhim") return `bhim://pay?${params.toString()}`;
  return `upi://pay?${params.toString()}`;
}

function DepositForm({ settings, onDone }) {
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const upi = settings.upi_id || "m11clube@upi";
  const payee = settings.upi_payee_name || "M11 CLUBE";
  const min = settings.min_deposit || 100;
  const num = parseInt(amount) || 0;

  const copy = async (text, label = "Copied") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const submit = async () => {
    if (num < min) return toast.error(`Min deposit ${min}`);
    if (!utr || utr.length < 6) return toast.error("Enter valid UTR / transaction ref");
    setLoading(true);
    try {
      await api.post("/wallet/deposit", { amount: num, utr, method: "upi" });
      toast.success("Deposit request submitted. Wait for admin approval.");
      setAmount(""); setUtr(""); onDone();
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  };

  const upiApps = [
    { key: "phonepe", name: "PhonePe", color: "#5F259F" },
    { key: "gpay", name: "GPay", color: "#1A73E8" },
    { key: "paytm", name: "Paytm", color: "#00BAF2" },
    { key: "bhim", name: "BHIM", color: "#FF7C00" },
    { key: "", name: "Any UPI", color: "#0F172A" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="deposit-form">
      <Label className="text-xs uppercase tracking-wider text-slate-600">Quick Amount</Label>
      <div className="grid grid-cols-4 gap-2 mt-1.5 mb-3" data-testid="quick-amounts">
        {QUICK_AMOUNTS.map(a => (
          <button key={a} onClick={() => setAmount(String(a))} data-testid={`qa-${a}`}
            className={`text-sm font-semibold py-2 rounded-md border transition tabular-nums ${num === a ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200 hover:border-[#FF7A00] hover:text-[#FF7A00]"}`}>
            {a >= 1000 ? `${a/1000}K` : a}
          </button>
        ))}
      </div>

      <Label className="text-xs uppercase tracking-wider text-slate-600">Custom Amount</Label>
      <div className="relative mt-1.5">
        <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
        <Input data-testid="deposit-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="pl-9 h-11" placeholder={`Min ${min}`} />
      </div>

      {num >= min && (
        <div className="bg-slate-900 text-white rounded-xl p-4 mt-4">
          <div className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold mb-2">Pay {num} via UPI</div>
          <button onClick={() => copy(upi, "UPI ID copied")} data-testid="upi-id" className="font-display font-bold text-lg tracking-tight inline-flex items-center gap-2 hover:text-amber-300 transition">
            {upi} <Copy className="w-3.5 h-3.5" />
          </button>
          <div className="text-[10px] text-white/60 mt-1 mb-3">Tap an app below to pay {num} pts directly</div>
          <div className="grid grid-cols-5 gap-1.5" data-testid="upi-apps">
            {upiApps.map(app => (
              <a key={app.key || "any"} href={buildUpiUrl({ upi_id: upi, payee, amount: num, app: app.key, note: `Deposit-${num}` })}
                data-testid={`upi-${app.key || "any"}`}
                className="text-center bg-white/10 hover:bg-white/20 rounded-lg p-2 text-[10px] font-semibold transition">
                <Smartphone className="w-4 h-4 mx-auto mb-1" />
                {app.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <Label className="text-xs uppercase tracking-wider text-slate-600 mt-3 block">UTR / Reference (after payment)</Label>
      <Input data-testid="deposit-utr" value={utr} onChange={(e)=>setUtr(e.target.value)} className="mt-1.5 h-11" placeholder="Transaction reference" />
      <Button data-testid="deposit-submit" onClick={submit} disabled={loading} className="w-full mt-4 h-11 btn-brand"><Wallet className="w-4 h-4 mr-1.5" />{loading ? "Submitting…" : "Submit Deposit"}</Button>
      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">After payment in your UPI app, copy the UTR / Transaction ID and paste it above. Funds will be credited to your wallet after admin verification (usually under 30 min).</p>
    </div>
  );
}

function WithdrawForm({ settings, onDone }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState({ holder_name: "", bank_name: "", account_number: "", ifsc: "" });
  const [loading, setLoading] = useState(false);
  const minW = settings.min_withdraw ?? 500;
  const wo = settings.withdraw_open_time;
  const wc = settings.withdraw_close_time;
  const num = parseInt(amount) || 0;

  const submit = async () => {
    if (num < minW) return toast.error(`Min withdraw is ${minW}`);
    const body = { amount: num, method };
    if (method === "upi") {
      if (upi.length < 4) return toast.error("Enter valid UPI ID");
      body.upi_id = upi;
    } else {
      if (!bank.holder_name || !bank.bank_name || !bank.account_number || !bank.ifsc) return toast.error("Fill all bank details");
      Object.assign(body, bank);
    }
    setLoading(true);
    try {
      await api.post("/wallet/withdraw", body);
      toast.success("Withdrawal request submitted.");
      setAmount(""); setUpi(""); setBank({ holder_name: "", bank_name: "", account_number: "", ifsc: "" });
      onDone();
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="withdraw-form">
      {wo && wc && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg p-2 mb-3 text-center">
          Withdrawals open {wo} → {wc} (IST)
        </div>
      )}

      <Label className="text-xs uppercase tracking-wider text-slate-600">Quick Amount</Label>
      <div className="grid grid-cols-4 gap-2 mt-1.5 mb-3" data-testid="qa-withdraw">
        {QUICK_AMOUNTS.filter(a => a >= 500).map(a => (
          <button key={a} onClick={() => setAmount(String(a))}
            className={`text-sm font-semibold py-2 rounded-md border transition tabular-nums ${num === a ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200 hover:border-[#FF7A00] hover:text-[#FF7A00]"}`}>
            {a >= 1000 ? `${a/1000}K` : a}
          </button>
        ))}
      </div>

      <Label className="text-xs uppercase tracking-wider text-slate-600">Custom Amount</Label>
      <div className="relative mt-1.5">
        <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
        <Input data-testid="withdraw-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="pl-9 h-11" placeholder={`Min ${minW}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="withdraw-method">
        <button onClick={()=>setMethod("upi")} className={`text-sm font-medium py-2.5 rounded-lg border transition ${method==="upi" ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200"}`} data-testid="method-upi">UPI</button>
        <button onClick={()=>setMethod("bank")} className={`text-sm font-medium py-2.5 rounded-lg border transition ${method==="bank" ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200"}`} data-testid="method-bank">Bank Transfer</button>
      </div>

      {method === "upi" ? (
        <div className="mt-3">
          <Label className="text-xs uppercase tracking-wider text-slate-600">Your UPI ID</Label>
          <Input data-testid="withdraw-upi" value={upi} onChange={(e)=>setUpi(e.target.value)} className="mt-1.5 h-11" placeholder="yourname@bank" autoComplete="off" />
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div><Label className="text-xs uppercase tracking-wider text-slate-600">Account Holder Name</Label><Input data-testid="wd-holder" value={bank.holder_name} onChange={(e)=>setBank({...bank, holder_name: e.target.value})} className="mt-1.5 h-11" autoComplete="off" /></div>
          <div><Label className="text-xs uppercase tracking-wider text-slate-600">Bank Name</Label><Input data-testid="wd-bank-name" value={bank.bank_name} onChange={(e)=>setBank({...bank, bank_name: e.target.value})} className="mt-1.5 h-11" autoComplete="off" /></div>
          <div><Label className="text-xs uppercase tracking-wider text-slate-600">Account Number</Label><Input data-testid="wd-account" inputMode="numeric" value={bank.account_number} onChange={(e)=>setBank({...bank, account_number: e.target.value.replace(/\D/g,"")})} className="mt-1.5 h-11 tabular-nums" autoComplete="off" /></div>
          <div><Label className="text-xs uppercase tracking-wider text-slate-600">IFSC Code</Label><Input data-testid="wd-ifsc" value={bank.ifsc} onChange={(e)=>setBank({...bank, ifsc: e.target.value.toUpperCase()})} className="mt-1.5 h-11 uppercase tracking-wider" autoComplete="off" /></div>
        </div>
      )}

      <Button data-testid="withdraw-submit" onClick={submit} disabled={loading} className="w-full mt-4 h-11 bg-slate-900 hover:bg-slate-800 text-white">{loading ? "Submitting…" : "Request Withdrawal"}</Button>
    </div>
  );
}
