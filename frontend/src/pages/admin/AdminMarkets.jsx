import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { toast, Toaster } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = { name: "", open_time: "10:00", close_time: "12:00", status: "active", days_active: ["mon","tue","wed","thu","fri","sat"] };

export default function AdminMarkets() {
  const [markets, setMarkets] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/admin/markets").then(({data})=>setMarkets(data));
  useEffect(() => { load(); }, []);

  const save = async (m) => {
    try {
      if (m.id) {
        await api.patch(`/admin/markets/${m.id}`, m);
        toast.success("Market updated");
      } else {
        await api.post("/admin/markets", m);
        toast.success("Market created");
      }
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this market?")) return;
    try { await api.delete(`/admin/markets/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const cleanupDefaults = async () => {
    if (!window.confirm("Saare purane markets (default list mein nahi hain) delete kar denge. Sahi hai?")) return;
    try {
      const { data } = await api.post("/admin/markets/cleanup-defaults", {});
      toast.success(`${data.deleted} purane markets delete kar diye`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Management</div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Markets</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button data-testid="cleanup-defaults-btn" onClick={cleanupDefaults} variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
            <Trash2 className="w-4 h-4 mr-1" /> Cleanup Old Markets
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-market-btn" onClick={()=>setEditing({...empty})} className="btn-brand"><Plus className="w-4 h-4 mr-1" /> Add Market</Button>
            </DialogTrigger>
            <MarketDialog editing={editing} setEditing={setEditing} save={save} />
          </Dialog>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="markets-table">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Open</th>
              <th className="text-left px-4 py-3">Close</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Result</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {markets.map(m => (
              <tr key={m.id} className="border-t border-slate-100" data-testid={`row-${m.id}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                <td className="px-4 py-3 tabular-nums">{m.open_time}</td>
                <td className="px-4 py-3 tabular-nums">{m.close_time}</td>
                <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-md ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{m.status}</span></td>
                <td className="px-4 py-3 font-mono text-xs">{m.open_result || "***"} - {m.close_result || "***"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Dialog open={open && editing?.id === m.id} onOpenChange={(o)=>{ setOpen(o); if(!o) setEditing(null); }}>
                      <DialogTrigger asChild>
                        <button data-testid={`edit-${m.id}`} onClick={()=>{setEditing({...m}); setOpen(true);}} className="p-1.5 hover:bg-slate-100 rounded-md"><Pencil className="w-4 h-4 text-slate-600" /></button>
                      </DialogTrigger>
                      <MarketDialog editing={editing} setEditing={setEditing} save={save} />
                    </Dialog>
                    <button data-testid={`delete-${m.id}`} onClick={()=>remove(m.id)} className="p-1.5 hover:bg-red-50 rounded-md text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function MarketDialog({ editing, setEditing, save }) {
  if (!editing) return null;
  return (
    <DialogContent className="bg-white">
      <DialogHeader><DialogTitle>{editing.id ? "Edit Market" : "Add Market"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Name</Label><Input data-testid="market-name-input" value={editing.name} onChange={(e)=>setEditing({...editing, name: e.target.value})} className="mt-1.5" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Open Time</Label><Input data-testid="market-open-input" type="time" value={editing.open_time} onChange={(e)=>setEditing({...editing, open_time: e.target.value})} className="mt-1.5" /></div>
          <div><Label>Close Time</Label><Input data-testid="market-close-input" type="time" value={editing.close_time} onChange={(e)=>setEditing({...editing, close_time: e.target.value})} className="mt-1.5" /></div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch data-testid="market-status-switch" checked={editing.status === "active"} onCheckedChange={(v)=>setEditing({...editing, status: v ? "active" : "inactive"})} />
        </div>
        <Button data-testid="market-save-btn" onClick={()=>save(editing)} className="w-full btn-brand h-10">Save</Button>
      </div>
    </DialogContent>
  );
}
