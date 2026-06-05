import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { toast, Toaster } from "sonner";
import { Search, ShieldOff, ShieldCheck, Wallet } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [adjustingUser, setAdjustingUser] = useState(null);
  const [adjustAmt, setAdjustAmt] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const load = () => api.get("/admin/users", { params: { q } }).then(({data})=>setUsers(data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  const toggle = async (id) => {
    try { await api.post(`/admin/users/${id}/toggle-block`); toast.success("Updated"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const adjust = async () => {
    const amt = parseInt(adjustAmt);
    if (Number.isNaN(amt) || amt === 0) return toast.error("Enter non-zero amount (+credit or -debit)");
    try {
      await api.post("/admin/wallet/adjust", { user_id: adjustingUser.id, amount: amt, note: adjustNote });
      toast.success("Wallet updated");
      setAdjustingUser(null); setAdjustAmt(""); setAdjustNote(""); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Management</div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Users</h1>
        </div>
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input data-testid="user-search" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by name or mobile" className="pl-9" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Mobile</th>
              <th className="text-right px-4 py-3">Balance</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody data-testid="users-table-body">
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-100" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600">{u.mobile}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{u.wallet_balance}</td>
                <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-md ${u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{u.status}</span></td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button data-testid={`adjust-${u.id}`} onClick={()=>setAdjustingUser(u)} className="inline-flex items-center gap-1 text-xs border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-md"><Wallet className="w-3 h-3" /> Adjust</button>
                    <button data-testid={`block-${u.id}`} onClick={()=>toggle(u.id)} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${u.status === "active" ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                      {u.status === "active" ? (<><ShieldOff className="w-3 h-3" /> Block</>) : (<><ShieldCheck className="w-3 h-3" /> Unblock</>)}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!adjustingUser} onOpenChange={(o)=>{if(!o)setAdjustingUser(null);}}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Adjust Wallet — {adjustingUser?.name}</DialogTitle></DialogHeader>
          <div className="text-xs text-slate-500 mb-2">Current balance: <span className="tabular-nums font-semibold text-slate-900">{adjustingUser?.wallet_balance}</span></div>
          <Input data-testid="adjust-amount" placeholder="Amount (+credit or -debit)" value={adjustAmt} onChange={(e)=>setAdjustAmt(e.target.value)} className="mb-2" />
          <Input data-testid="adjust-note" placeholder="Note (optional)" value={adjustNote} onChange={(e)=>setAdjustNote(e.target.value)} className="mb-2" />
          <Button data-testid="adjust-submit" onClick={adjust} className="w-full btn-brand h-10">Apply</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
