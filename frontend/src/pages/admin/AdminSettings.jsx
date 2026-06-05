import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { toast, Toaster } from "sonner";
import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";

export default function AdminSettings() {
  const [s, setS] = useState({});
  const [posters, setPosters] = useState([]);
  const [broadcast, setBroadcast] = useState({ title: "", body: "" });

  useEffect(() => {
    api.get("/settings").then(({data})=> {
      setS(data);
      setPosters(data.posters || []);
    });
  }, []);

  const save = async (patch) => {
    try {
      const { data } = await api.patch("/admin/settings", patch);
      setS(data);
      toast.success("Saved");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const savePosters = async () => {
    await save({ posters });
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
          <Field label="Telegram URL" value={s.telegram_url || ""} onSave={(v)=>save({ telegram_url: v })} testid="telegram" />
          <Field label="UPI ID" value={s.upi_id || ""} onSave={(v)=>save({ upi_id: v })} testid="upi" />
          <Field label="QR Code Image URL" value={s.qr_code_url || ""} onSave={(v)=>save({ qr_code_url: v })} testid="qr" />
          <Field label="Min Deposit (points)" type="number" value={s.min_deposit ?? 100} onSave={(v)=>save({ min_deposit: parseInt(v) })} testid="min-dep" />
          <Field label="Min Withdraw (points)" type="number" value={s.min_withdraw ?? 500} onSave={(v)=>save({ min_withdraw: parseInt(v) })} testid="min-wd" />
        </Card>

        <Card title="Withdrawal Time Window (IST)">
          <p className="text-xs text-slate-500 mb-3">Users can only request withdrawals between these times. Set same value (e.g. 00:00 / 23:59) to keep it always open.</p>
          <Field label="Open Time (HH:MM)" value={s.withdraw_open_time || "00:00"} onSave={(v)=>save({ withdraw_open_time: v })} testid="wd-open" />
          <Field label="Close Time (HH:MM)" value={s.withdraw_close_time || "23:59"} onSave={(v)=>save({ withdraw_close_time: v })} testid="wd-close" />

          <div className="border-t border-slate-100 mt-5 pt-4">
            <div className="font-display font-semibold text-slate-900 mb-1">Auto Result API</div>
            <p className="text-xs text-slate-500 mb-3">Optional. Provide a webhook URL that returns today's market results. Once configured, the Fetch button on Results page will hit it.</p>
            <Field label="Result API URL" value={s.result_api_url || ""} onSave={(v)=>save({ result_api_url: v })} testid="result-api" />
          </div>
        </Card>

        <Card title="Scrolling Notice & Broadcast">
          <Label>Notice Text</Label>
          <Textarea data-testid="notice-input" rows={4} value={s.notice_text || ""} onChange={(e)=>setS({...s, notice_text: e.target.value})} className="mt-1.5" />
          <Button data-testid="notice-save" onClick={()=>save({ notice_text: s.notice_text })} className="mt-2 btn-brand h-10">Save Notice</Button>

          <div className="border-t border-slate-100 mt-5 pt-4">
            <div className="font-display font-semibold text-slate-900 mb-2">Broadcast Notification</div>
            <Input data-testid="bc-title" placeholder="Title" value={broadcast.title} onChange={(e)=>setBroadcast({...broadcast, title: e.target.value})} className="mb-2" />
            <Textarea data-testid="bc-body" placeholder="Message body" rows={3} value={broadcast.body} onChange={(e)=>setBroadcast({...broadcast, body: e.target.value})} />
            <Button data-testid="bc-send" onClick={sendBroadcast} className="mt-2 bg-slate-900 hover:bg-slate-800 text-white h-10">Send to All</Button>
          </div>
        </Card>

        <Card title="Home Posters (Sliders)">
          <p className="text-xs text-slate-500 mb-3">Up to 5 posters shown on the user app dashboard above the quick icons. Use a 16:8 ratio image URL.</p>
          {posters.map((p, i) => (
            <div key={i} className="flex gap-2 items-center mb-2" data-testid={`poster-row-${i}`}>
              <div className="w-12 h-12 rounded-md bg-slate-100 overflow-hidden shrink-0">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400 m-3" />}
              </div>
              <Input placeholder="Image URL" value={p.image_url || ""} onChange={(e)=>{ const next=[...posters]; next[i]={...next[i], image_url: e.target.value}; setPosters(next); }} className="flex-1" data-testid={`poster-url-${i}`} />
              <Input placeholder="Click link (optional)" value={p.link || ""} onChange={(e)=>{ const next=[...posters]; next[i]={...next[i], link: e.target.value}; setPosters(next); }} className="flex-1" />
              <button onClick={()=>setPosters(posters.filter((_,j)=>j!==i))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-md" data-testid={`poster-remove-${i}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {posters.length < 5 && (
            <Button onClick={()=>setPosters([...posters, { image_url: "", link: "" }])} variant="outline" className="border-dashed border-slate-300 w-full h-10 mt-1" data-testid="poster-add"><Plus className="w-4 h-4 mr-1" /> Add Poster</Button>
          )}
          <Button onClick={savePosters} className="btn-brand h-10 w-full mt-3" data-testid="posters-save">Save Posters</Button>
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
