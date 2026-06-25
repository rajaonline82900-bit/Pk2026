import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { IndianRupee } from "lucide-react";

export default function WithdrawPage() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState({});
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [upi, setUpi] = useState("");
  const [bank, setBank] = useState({ holder_name: "", bank_name: "", account_number: "", ifsc: "" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { api.get("/settings").then(({data}) => setSettings(data)); }, []);

  const minW = settings.min_withdraw ?? 500;
  const wo = settings.withdraw_open_time;
  const wc = settings.withdraw_close_time;
  const num = parseInt(amount) || 0;

  const submit = async () => {
    if (num < minW) return toast.error(`⚠️ Minimum withdrawal ₹${minW} hai. Aapne ₹${num} request kiya — kam se kam ₹${minW} chahiye.`);
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
      toast.success("Withdrawal request submitted");
      setAmount(""); setUpi(""); setBank({ holder_name: "", bank_name: "", account_number: "", ifsc: "" });
      refreshUser();
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  };

  return (
    <MobileLayout>
      <Toaster richColors position="top-center" />
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl p-5 mb-4">
        <div className="text-[11px] uppercase tracking-widest opacity-80">Wallet Balance</div>
        <div className="font-display font-bold text-4xl tabular-nums mt-1" data-testid="wallet-balance-display">{user?.wallet_balance ?? 0}</div>
        <div className="text-xs opacity-80 mt-1">points</div>
      </div>

      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Withdraw</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="withdraw-form">
        {wo && wc && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg p-2 mb-3 text-center">
            Withdrawals open {wo} → {wc} (IST)
          </div>
        )}
        <Label className="text-xs uppercase tracking-wider text-slate-600">Amount (points)</Label>
        <div className="relative mt-1.5">
          <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <Input data-testid="withdraw-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="pl-9 h-11" placeholder={`Min ${minW}`} />
        </div>

        {/* Live red-blinking warning when amount below minimum */}
        {num > 0 && num < minW && (
          <div data-testid="min-withdraw-warning" className="mt-3 blink-red border-2 rounded-xl p-3 font-bold text-center text-sm" style={{ fontFamily: '"Noto Sans Devanagari", system-ui, sans-serif' }}>
            ⚠️ न्यूनतम निकासी ₹{minW} है — आपने ₹{num} माँगा है। कम से कम ₹{minW} दर्ज करें।
          </div>
        )}

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
    </MobileLayout>
  );
}
