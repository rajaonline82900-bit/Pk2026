import React, { useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";

export default function MPinPage() {
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (newP.length !== 4) return toast.error("New MPIN must be 4 digits");
    if (newP !== confirm) return toast.error("MPINs do not match");
    setLoading(true);
    try {
      await api.post("/auth/change-mpin", { old_mpin: oldP, new_mpin: newP });
      toast.success("MPIN updated");
      setOldP(""); setNewP(""); setConfirm("");
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  };

  return (
    <MobileLayout>
      <Toaster richColors position="top-center" />
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">MPIN Management</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-600">Current MPIN</Label>
          <Input data-testid="mpin-old" type="password" inputMode="numeric" maxLength={4} value={oldP} onChange={(e)=>setOldP(e.target.value.replace(/\D/g,""))} className="mt-1.5 h-11 tracking-widest" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-600">New MPIN</Label>
          <Input data-testid="mpin-new" type="password" inputMode="numeric" maxLength={4} value={newP} onChange={(e)=>setNewP(e.target.value.replace(/\D/g,""))} className="mt-1.5 h-11 tracking-widest" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-600">Confirm New MPIN</Label>
          <Input data-testid="mpin-confirm" type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={(e)=>setConfirm(e.target.value.replace(/\D/g,""))} className="mt-1.5 h-11 tracking-widest" />
        </div>
        <Button data-testid="mpin-submit" onClick={submit} disabled={loading} className="w-full h-11 btn-brand">{loading ? "Saving…" : "Update MPIN"}</Button>
      </div>
    </MobileLayout>
  );
}
