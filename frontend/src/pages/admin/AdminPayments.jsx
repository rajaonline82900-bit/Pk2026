import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast, Toaster } from "sonner";

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
        <TabsContent value="deposits"><PaymentTable type="deposit" /></TabsContent>
        <TabsContent value="withdrawals"><PaymentTable type="withdraw" /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

function PaymentTable({ type }) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState({});
  const load = () => api.get("/admin/transactions", { params: { type } }).then(({data})=>setItems(data));
  useEffect(() => { load(); }, [type]); // eslint-disable-line

  const act = async (id, action) => {
    try {
      await api.post("/admin/transactions/action", { transaction_id: id, action, admin_note: notes[id] || "" });
      toast.success(`${action === "approve" ? "Approved" : "Rejected"}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-3">User</th>
            <th className="text-left px-4 py-3">Amount</th>
            <th className="text-left px-4 py-3">{type === "deposit" ? "UTR" : "Account"}</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody data-testid={`${type}-table`}>
          {items.length === 0 ? (
            <tr><td colSpan="6" className="text-center py-12 text-slate-400">No transactions</td></tr>
          ) : items.map(t => (
            <tr key={t.id} className="border-t border-slate-100" data-testid={`${type}-row-${t.id}`}>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">{t.user_name}</div>
                <div className="text-xs text-slate-500 tabular-nums">{t.user_mobile}</div>
              </td>
              <td className="px-4 py-3 tabular-nums font-semibold">{Math.abs(t.amount)}</td>
              <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">{type === "deposit" ? t.utr : t.account_info}</td>
              <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-md ${t.status === "approved" ? "bg-emerald-50 text-emerald-700" : t.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{t.status}</span></td>
              <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                {t.status === "pending" ? (
                  <div className="inline-flex gap-2 items-center">
                    <Input className="w-32 h-8 text-xs" placeholder="Note" value={notes[t.id] || ""} onChange={(e)=>setNotes(n=>({...n, [t.id]: e.target.value}))} data-testid={`note-${t.id}`} />
                    <Button data-testid={`approve-${t.id}`} onClick={()=>act(t.id, "approve")} className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">Approve</Button>
                    <Button data-testid={`reject-${t.id}`} onClick={()=>act(t.id, "reject")} variant="outline" className="h-8 px-3 text-xs border-rose-200 text-rose-600 hover:bg-rose-50">Reject</Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">{t.admin_note || "—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
