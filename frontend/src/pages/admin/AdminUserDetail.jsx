import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast, Toaster } from "sonner";
import { ArrowLeft, ShieldOff, ShieldCheck, Wallet, Phone, IndianRupee, ArrowDownToLine, ArrowUpFromLine, Trophy, Receipt } from "lucide-react";

const badge = (status) => {
  const m = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    won: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lost: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return `text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md border ${m[status] || "bg-slate-50 text-slate-600 border-slate-200"}`;
};

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmt, setAdjustAmt] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const load = () => api.get(`/admin/users/${id}/detail`).then(({data}) => setData(data));
  useEffect(() => { load(); }, [id]);

  const toggleBlock = async () => {
    try { await api.post(`/admin/users/${id}/toggle-block`); toast.success("Updated"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const adjust = async () => {
    const amt = parseInt(adjustAmt);
    if (Number.isNaN(amt) || amt === 0) return toast.error("Enter non-zero amount");
    try {
      await api.post("/admin/wallet/adjust", { user_id: id, amount: amt, note: adjustNote });
      toast.success("Wallet updated"); setAdjustOpen(false); setAdjustAmt(""); setAdjustNote(""); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (!data) return <AdminLayout><div className="h-40 bg-slate-100 rounded-xl animate-pulse" /></AdminLayout>;
  const { user, bids, deposits, withdrawals, transactions, summary } = data;

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <button onClick={() => navigate("/admin/users")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-3" data-testid="back-btn"><ArrowLeft className="w-4 h-4" /> Back to users</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">User</div>
            <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1" data-testid="ud-name">{user.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500"><Phone className="w-3.5 h-3.5" /> <span data-testid="ud-mobile">{user.mobile}</span></div>
            <div className="mt-2 inline-flex items-center gap-2">
              <span className={badge(user.status === "active" ? "approved" : "rejected")}>{user.status}</span>
              <span className="text-xs text-slate-500">Joined {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAdjustOpen(true)} data-testid="ud-adjust" className="btn-brand h-10"><Wallet className="w-4 h-4 mr-1" /> Adjust Wallet</Button>
            <Button onClick={toggleBlock} variant="outline" data-testid="ud-toggle-block" className={`h-10 border ${user.status === "active" ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
              {user.status === "active" ? <><ShieldOff className="w-4 h-4 mr-1" /> Block</> : <><ShieldCheck className="w-4 h-4 mr-1" /> Unblock</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard icon={Wallet} color="bg-amber-50 text-amber-700" label="Wallet" value={user.wallet_balance} />
        <StatCard icon={ArrowDownToLine} color="bg-emerald-50 text-emerald-700" label="Total Deposit" value={summary.total_deposit} />
        <StatCard icon={ArrowUpFromLine} color="bg-rose-50 text-rose-700" label="Total Withdraw" value={summary.total_withdraw} />
        <StatCard icon={IndianRupee} color="bg-violet-50 text-violet-700" label="Total Bid" value={summary.total_bid} />
        <StatCard icon={Trophy} color="bg-orange-50 text-orange-700" label="Total Won" value={summary.total_won} />
      </div>

      <Tabs defaultValue="bids" data-testid="ud-tabs">
        <TabsList className="bg-slate-100 mb-4">
          <TabsTrigger value="bids" data-testid="ud-tab-bids">Bids ({bids.length})</TabsTrigger>
          <TabsTrigger value="deposits" data-testid="ud-tab-deposits">Deposits ({deposits.length})</TabsTrigger>
          <TabsTrigger value="withdrawals" data-testid="ud-tab-withdrawals">Withdrawals ({withdrawals.length})</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="ud-tab-transactions">All Transactions ({transactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bids"><BidsTable bids={bids} /></TabsContent>
        <TabsContent value="deposits"><TxnTable txns={deposits} kind="deposit" /></TabsContent>
        <TabsContent value="withdrawals"><TxnTable txns={withdrawals} kind="withdraw" /></TabsContent>
        <TabsContent value="transactions"><TxnTable txns={transactions} kind="all" /></TabsContent>
      </Tabs>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Adjust wallet — {user.name}</DialogTitle></DialogHeader>
          <div className="text-xs text-slate-500 mb-2">Current balance: <span className="tabular-nums font-semibold text-slate-900">{user.wallet_balance}</span></div>
          <Input placeholder="Amount (+credit / -debit)" value={adjustAmt} onChange={(e)=>setAdjustAmt(e.target.value)} className="mb-2" data-testid="ud-adjust-amount" />
          <Input placeholder="Note (optional)" value={adjustNote} onChange={(e)=>setAdjustNote(e.target.value)} className="mb-2" data-testid="ud-adjust-note" />
          <Button onClick={adjust} className="w-full btn-brand h-10" data-testid="ud-adjust-submit">Apply</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}><Icon className="w-4 h-4" /></div>
      <div className="text-xl font-display font-semibold tabular-nums text-slate-900">{value ?? 0}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function BidsTable({ bids }) {
  if (bids.length === 0) return <Empty label="No bids placed yet" />;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
          <tr>
            <th className="text-left px-4 py-3">Market</th>
            <th className="text-left px-4 py-3">Game</th>
            <th className="text-left px-4 py-3">Session</th>
            <th className="text-left px-4 py-3">Number</th>
            <th className="text-right px-4 py-3">Bid</th>
            <th className="text-right px-4 py-3">Win</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">When</th>
          </tr>
        </thead>
        <tbody>
          {bids.map(b => (
            <tr key={b.id} className="border-t border-slate-100" data-testid={`ud-bid-${b.id}`}>
              <td className="px-4 py-3 font-medium text-slate-900">{b.market_name}</td>
              <td className="px-4 py-3 text-slate-600">{b.game_name}</td>
              <td className="px-4 py-3 uppercase text-xs text-slate-500">{b.session || "—"}</td>
              <td className="px-4 py-3 font-mono">{b.number}</td>
              <td className="px-4 py-3 text-right tabular-nums">{b.amount}</td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{b.win_amount || 0}</td>
              <td className="px-4 py-3"><span className={badge(b.status)}>{b.status}</span></td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(b.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TxnTable({ txns, kind }) {
  if (txns.length === 0) return <Empty label={`No ${kind === "all" ? "transactions" : kind + "s"} yet`} />;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
          <tr>
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-right px-4 py-3">Amount</th>
            <th className="text-left px-4 py-3">Method / Ref</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Note</th>
            <th className="text-left px-4 py-3">When</th>
          </tr>
        </thead>
        <tbody>
          {txns.map(t => (
            <tr key={t.id} className="border-t border-slate-100" data-testid={`ud-txn-${t.id}`}>
              <td className="px-4 py-3 text-slate-700 uppercase text-xs font-medium">{t.type.replace("_"," ")}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{t.amount >= 0 ? "+" : ""}{t.amount}</td>
              <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">{t.utr || t.account_info || "—"}</td>
              <td className="px-4 py-3"><span className={badge(t.status)}>{t.status}</span></td>
              <td className="px-4 py-3 text-xs text-slate-600 max-w-[240px] truncate">{t.note || t.admin_note || "—"}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Empty = ({ label }) => (
  <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-slate-400 text-sm">
    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
    {label}
  </div>
);
