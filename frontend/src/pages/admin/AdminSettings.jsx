import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast, Toaster } from "sonner";

export default function AdminSettings() {
  const [s, setS] = useState({});
  const [broadcast, setBroadcast] = useState({ title: "", body: "" });

  useEffect(() => { api.get("/settings").then(({data})=>setS(data)); }, []);

  const save = async (patch) => {
    try {
      const { data } = await api.patch("/admin/settings", patch);
      setS(data);
      toast.success("Saved");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const sendBroadcast = async () => {
    if (!broadcast.title || !broadcast.body) return toast.error("Title and body required");
    try {
      await api.post("/admin/notice/broadcast", broadcast);
      toast.success("Broadcast sent");
      setBroadcast({ title: "", body: "" });
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const rates = s.game_rates || {};

  return (
    <AdminLayout>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Configuration</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">System Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Contact & Payment">
          <Field label="WhatsApp Number" value={s.whatsapp_number || ""} onSave={(v)=>save({ whatsapp_number: v })} testid="whatsapp" />
          <Field label="UPI ID" value={s.upi_id || ""} onSave={(v)=>save({ upi_id: v })} testid="upi" />
          <Field label="QR Code Image URL" value={s.qr_code_url || ""} onSave={(v)=>save({ qr_code_url: v })} testid="qr" />
          <Field label="Min Deposit (points)" type="number" value={s.min_deposit ?? 100} onSave={(v)=>save({ min_deposit: parseInt(v) })} testid="min-dep" />
          <Field label="Min Withdraw (points)" type="number" value={s.min_withdraw ?? 500} onSave={(v)=>save({ min_withdraw: parseInt(v) })} testid="min-wd" />
        </Card>

        <Card title="Scrolling Notice">
          <Label>Notice Text</Label>
          <Textarea data-testid="notice-input" rows={5} value={s.notice_text || ""} onChange={(e)=>setS({...s, notice_text: e.target.value})} className="mt-1.5" />
          <Button data-testid="notice-save" onClick={()=>save({ notice_text: s.notice_text })} className="mt-2 btn-brand h-10">Save Notice</Button>

          <div className="border-t border-slate-100 mt-5 pt-4">
            <div className="font-display font-semibold text-slate-900 mb-2">Broadcast Notification</div>
            <Input data-testid="bc-title" placeholder="Title" value={broadcast.title} onChange={(e)=>setBroadcast({...broadcast, title: e.target.value})} className="mb-2" />
            <Textarea data-testid="bc-body" placeholder="Message body" rows={3} value={broadcast.body} onChange={(e)=>setBroadcast({...broadcast, body: e.target.value})} />
            <Button data-testid="bc-send" onClick={sendBroadcast} className="mt-2 bg-slate-900 hover:bg-slate-800 text-white h-10">Send to All</Button>
          </div>
        </Card>

        <Card title="Game Rates" className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" data-testid="rates-grid">
            {Object.entries(rates).map(([key, rate]) => (
              <RateRow key={key} k={key} rate={rate} onSave={(v) => save({ game_rates: { ...rates, [key]: parseFloat(v) } })} />
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      <div className="font-display font-semibold text-slate-900 mb-4">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onSave, testid, type = "text" }) {
  const [v, setV] = useState(value);
  useEffect(()=>setV(value), [value]);
  return (
    <div className="mb-3">
      <Label className="text-xs uppercase tracking-wider text-slate-600">{label}</Label>
      <div className="flex gap-2 mt-1.5">
        <Input data-testid={`set-${testid}`} type={type} value={v} onChange={(e)=>setV(e.target.value)} className="flex-1" />
        <Button data-testid={`save-${testid}`} onClick={()=>onSave(v)} className="btn-brand h-10 px-4">Save</Button>
      </div>
    </div>
  );
}

function RateRow({ k, rate, onSave }) {
  const [v, setV] = useState(rate);
  useEffect(()=>setV(rate), [rate]);
  return (
    <div className="border border-slate-200 rounded-lg p-3" data-testid={`rate-${k}`}>
      <div className="text-xs font-medium text-slate-600 mb-1">{k}</div>
      <div className="flex gap-2">
        <Input type="number" step="0.1" value={v} onChange={(e)=>setV(e.target.value)} className="flex-1 h-9" />
        <Button onClick={()=>onSave(v)} className="h-9 text-xs px-3 btn-brand">Save</Button>
      </div>
    </div>
  );
}
