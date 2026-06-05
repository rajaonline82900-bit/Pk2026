import React, { useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { Wallet, QrCode, Copy, IndianRupee } from "lucide-react";
import { useEffect } from "react";

export default function Funds() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState({});
  useEffect(() => { api.get("/settings").then(({data}) => setSettings(data)); }, []);

  return (
    <MobileLayout>
      <Toaster richColors position="top-center" />
      <div className="bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white rounded-2xl p-5 mb-4">
        <div className="text-[11px] uppercase tracking-widest opacity-80">Wallet Balance</div>
        <div className="font-display font-bold text-4xl tabular-nums mt-1" data-testid="wallet-balance-display">{user?.wallet_balance ?? 0}</div>
        <div className="text-xs opacity-80 mt-1">points</div>
      </div>

      <Tabs defaultValue="deposit" data-testid="funds-tabs">
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

function DepositForm({ settings, onDone }) {
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const upi = settings.upi_id || "m11clube@upi";

  const copy = async () => {
    await navigator.clipboard.writeText(upi);
    toast.success("UPI ID copied");
  };

  const submit = async () => {
    if (!amount || parseInt(amount) < (settings.min_deposit || 100)) return toast.error(`Min deposit ${settings.min_deposit || 100}`);
    if (!utr || utr.length < 6) return toast.error("Enter valid UTR / transaction ref");
    setLoading(true);
    try {
      await api.post("/wallet/deposit", { amount: parseInt(amount), utr, method: "upi" });
      toast.success("Deposit request submitted. Wait for admin approval.");
      setAmount(""); setUtr(""); onDone();
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="deposit-form">
      <div className="bg-slate-900 text-white rounded-xl p-4 mb-4 text-center">
        {settings.qr_code_url ? (
          <img src={settings.qr_code_url} alt="QR" className="w-32 h-32 mx-auto rounded-lg bg-white p-2" />
        ) : (
          <QrCode className="w-12 h-12 mx-auto text-amber-300" />
        )}
        <div className="text-[11px] uppercase tracking-widest text-white/70 mt-2">Pay via UPI</div>
        <button onClick={copy} className="font-display font-bold text-lg tracking-tight mt-1 inline-flex items-center gap-2 hover:text-amber-300 transition" data-testid="upi-id">
          {upi} <Copy className="w-3.5 h-3.5" />
        </button>
        <div className="text-[10px] text-white/60 mt-1">Scan QR or pay to this UPI ID, then submit your UTR below.</div>
      </div>
      <Label className="text-xs uppercase tracking-wider text-slate-600">Amount (points)</Label>
      <Input data-testid="deposit-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="mt-1.5 h-11" placeholder={`Min ${settings.min_deposit || 100}`} />
      <Label className="text-xs uppercase tracking-wider text-slate-600 mt-3 block">UTR / Reference</Label>
      <Input data-testid="deposit-utr" value={utr} onChange={(e)=>setUtr(e.target.value)} className="mt-1.5 h-11" placeholder="Transaction reference" />
      <Button data-testid="deposit-submit" onClick={submit} disabled={loading} className="w-full mt-4 h-11 btn-brand"><Wallet className="w-4 h-4 mr-1.5" />{loading ? "Submitting…" : "Submit Deposit"}</Button>
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

  const submit = async () => {
    if (!amount || parseInt(amount) < minW) return toast.error(`Min withdraw is ${minW}`);
    const body = { amount: parseInt(amount), method };
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
          ⏱ Withdrawals open {wo} → {wc} (IST)
        </div>
      )}
      <Label className="text-xs uppercase tracking-wider text-slate-600">Amount (points)</Label>
      <div className="relative mt-1.5">
        <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
        <Input data-testid="withdraw-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="pl-9 h-11" placeholder={`Min ${minW}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="withdraw-method">
        <button onClick={()=>setMethod("upi")} className={`text-sm font-medium py-2.5 rounded-lg border transition ${method==="upi" ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`} data-testid="method-upi">UPI</button>
        <button onClick={()=>setMethod("bank")} className={`text-sm font-medium py-2.5 rounded-lg border transition ${method==="bank" ? "bg-[#FF7A00] text-white border-[#FF7A00]" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`} data-testid="method-bank">Bank Transfer</button>
      </div>

      {method === "upi" ? (
        <div className="mt-3">
          <Label className="text-xs uppercase tracking-wider text-slate-600">Your UPI ID</Label>
          <Input data-testid="withdraw-upi" value={upi} onChange={(e)=>setUpi(e.target.value)} className="mt-1.5 h-11" placeholder="yourname@bank" />
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Account Holder Name</Label>
            <Input data-testid="wd-holder" value={bank.holder_name} onChange={(e)=>setBank({...bank, holder_name: e.target.value})} className="mt-1.5 h-11" placeholder="As per bank record" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Bank Name</Label>
            <Input data-testid="wd-bank-name" value={bank.bank_name} onChange={(e)=>setBank({...bank, bank_name: e.target.value})} className="mt-1.5 h-11" placeholder="SBI / HDFC / ICICI…" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Account Number</Label>
            <Input data-testid="wd-account" inputMode="numeric" value={bank.account_number} onChange={(e)=>setBank({...bank, account_number: e.target.value.replace(/\D/g,"")})} className="mt-1.5 h-11 tabular-nums" placeholder="9–18 digits" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">IFSC Code</Label>
            <Input data-testid="wd-ifsc" value={bank.ifsc} onChange={(e)=>setBank({...bank, ifsc: e.target.value.toUpperCase()})} className="mt-1.5 h-11 uppercase tracking-wider" placeholder="HDFC0001234" />
          </div>
        </div>
      )}

      <Button data-testid="withdraw-submit" onClick={submit} disabled={loading} className="w-full mt-4 h-11 bg-slate-900 hover:bg-slate-800 text-white">{loading ? "Submitting…" : "Request Withdrawal"}</Button>
    </div>
  );
}
