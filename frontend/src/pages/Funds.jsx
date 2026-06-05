import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { Wallet, QrCode } from "lucide-react";

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
          <WithdrawForm onDone={refreshUser} />
        </TabsContent>
      </Tabs>
    </MobileLayout>
  );
}

function DepositForm({ settings, onDone }) {
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
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
        <QrCode className="w-12 h-12 mx-auto text-amber-300" />
        <div className="text-[11px] uppercase tracking-widest text-white/70 mt-2">Pay via UPI</div>
        <div className="font-display font-bold text-lg tracking-tight mt-1" data-testid="upi-id">{settings.upi_id || "m11clube@upi"}</div>
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

function WithdrawForm({ onDone }) {
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!amount || parseInt(amount) < 500) return toast.error("Min withdraw is 500");
    if (account.length < 4) return toast.error("Enter UPI ID or bank info");
    setLoading(true);
    try {
      await api.post("/wallet/withdraw", { amount: parseInt(amount), account_info: account });
      toast.success("Withdrawal request submitted.");
      setAmount(""); setAccount(""); onDone();
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="withdraw-form">
      <Label className="text-xs uppercase tracking-wider text-slate-600">Amount (points)</Label>
      <Input data-testid="withdraw-amount" inputMode="numeric" value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} className="mt-1.5 h-11" placeholder="Min 500" />
      <Label className="text-xs uppercase tracking-wider text-slate-600 mt-3 block">UPI ID / Bank Info</Label>
      <Input data-testid="withdraw-account" value={account} onChange={(e)=>setAccount(e.target.value)} className="mt-1.5 h-11" placeholder="your-upi@bank or A/c details" />
      <Button data-testid="withdraw-submit" onClick={submit} disabled={loading} className="w-full mt-4 h-11 bg-slate-900 hover:bg-slate-800 text-white">{loading ? "Submitting…" : "Request Withdrawal"}</Button>
    </div>
  );
}
