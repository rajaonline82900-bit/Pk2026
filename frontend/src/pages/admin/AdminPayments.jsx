import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast, Toaster } from "sonner";
import { Copy, CheckCircle2, XCircle } from "lucide-react";

export default function AdminPayments() {
  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Finance</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Payments</h1>
      </div>
      <Tabs defaultValue="deposits" data-testid="payments-tabs">
        <TabsList className="bg-slate-100 mb-4">
          <TabsTrigger value="deposits" data-testid="tab-deposits">Deposits</TabsTrigger>
          <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="deposits"><PaymentSection type="deposit" /></TabsContent>
        <TabsContent value="withdrawals"><PaymentSection type="withdraw" /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

const STATUSES = ["pending", "approved", "rejected"];

function PaymentSection({ type }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});

  const load = () => api.get("/admin/transactions", { params: { type } }).then(({data}) => setItems(data));
  useEffect(() => { load(); }, [type]); // eslint-disable-line

  const counts = { pending: 0, approved: 0, rejected: 0 };
  items.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
  const filtered = items.filter(t => t.status === filter);

  const act = async (id, action) => {
    try {
      await api.post("/admin/transactions/action", { transaction_id: id, action, admin_note: notes[id] || "" });
      toast.success(action === "approve" ? "Approved · wallet credited" : "Rejected");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const retryImb = async (t) => {
    if (!t.imb_order_id) return toast.error("Ye transaction IMB se nahi hai");
    try {
      const { data } = await api.post(`/admin/payments/retry-imb/${t.imb_order_id}`);
      if (data.credited) toast.success("✅ IMB se status check kiya — wallet credit ho gaya!");
      else toast.info(`IMB status: ${data.gateway?.status || "unknown"} — abhi success nahi mila`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const copy = async (text, label = "Copied") => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3" data-testid={`status-filter-${type}`}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} data-testid={`filter-${type}-${s}`}
            className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md border transition ${filter === s ? (s === "pending" ? "bg-amber-500 text-white border-amber-500" : s === "approved" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500") : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
            {s} <span className="ml-1 tabular-nums opacity-80">({counts[s]})</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">{type === "deposit" ? "UTR" : "Payout Details"}</th>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody data-testid={`${type}-table`}>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-slate-400">No {filter} {type === "deposit" ? "deposits" : "withdrawals"}</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="border-t border-slate-100 align-top" data-testid={`${type}-row-${t.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{t.user_name}</div>
                  <div className="text-xs text-slate-500 tabular-nums flex items-center gap-1.5">
                    {t.user_mobile}
                    <button onClick={() => copy(t.user_mobile, "Mobile copied")} className="text-slate-400 hover:text-slate-700"><Copy className="w-3 h-3" /></button>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-base text-slate-900">{Math.abs(t.amount)}</td>
                <td className="px-4 py-3 max-w-[300px]">
                  {type === "deposit" ? (
                    <div className="text-xs text-slate-700 font-mono break-all flex items-center gap-1.5">
                      {t.utr || "—"}
                      {t.utr && <button onClick={() => copy(t.utr, "UTR copied")} className="text-slate-400 hover:text-slate-700"><Copy className="w-3 h-3" /></button>}
                    </div>
                  ) : (
                    <WithdrawDetails t={t} copy={copy} />
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {t.status === "pending" ? (
                    <div className="inline-flex flex-col items-end gap-1.5 min-w-[260px]">
                      <Input className="w-full h-8 text-xs" placeholder="Note (optional)" value={notes[t.id] || ""} onChange={(e)=>setNotes(n=>({...n, [t.id]: e.target.value}))} data-testid={`note-${t.id}`} />
                      <div className="flex gap-1.5 flex-wrap">
                        <Button data-testid={`approve-${t.id}`} onClick={()=>act(t.id, "approve")} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>
                        <Button data-testid={`reject-${t.id}`} onClick={()=>act(t.id, "reject")} variant="outline" className="h-8 px-3 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                        {t.imb_order_id && t.type === "deposit" && (
                          <Button data-testid={`retry-imb-${t.id}`} onClick={()=>retryImb(t)} variant="outline" className="h-8 px-3 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">🔁 Retry IMB</Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">{t.admin_note || "—"}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WithdrawDetails({ t, copy }) {
  // Backend stores in `account_info`; older code used `method_details`. Read both.
  const md = t.method_details || t.account_info || {};
  const m = t.method || (md.upi_id ? "upi" : "bank");
  const Row = ({ label, value, hint }) => (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500 w-20 shrink-0">{label}</span>
      <span className="font-mono text-slate-800 break-all flex-1">{value || "—"}</span>
      {value && <button onClick={() => copy(value, `${hint || label} copied`)} className="text-slate-400 hover:text-slate-700"><Copy className="w-3 h-3" /></button>}
    </div>
  );
  if (m === "upi") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold">💸 UPI Withdrawal</div>
        <Row label="UPI ID" value={md.upi_id || t.account_info?.upi_id} hint="UPI ID" />
      </div>
    );
  }
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 space-y-1">
      <div className="text-[10px] uppercase tracking-widest text-blue-700 font-bold">🏦 Bank Transfer</div>
      <Row label="Holder" value={md.holder_name} />
      <Row label="Bank" value={md.bank_name} />
      <Row label="A/c No." value={md.account_number} />
      <Row label="IFSC" value={(md.ifsc || "").toUpperCase()} />
    </div>
  );
}
