import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (name.length < 2) return toast.error("Enter your name");
    if (mobile.length !== 10) return toast.error("Mobile must be 10 digits");
    if (mpin.length !== 4) return toast.error("MPIN must be 4 digits");
    if (mpin !== confirm) return toast.error("MPINs do not match");
    setLoading(true);
    try {
      await register(mobile, name, mpin);
      toast.success("Welcome to M11 CLUBE!");
      navigate("/");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white font-display font-bold text-2xl mb-4 shadow-lg shadow-orange-100">M11</div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Get ₹50 welcome bonus</p>
        </div>

        <form onSubmit={submit} className="space-y-3.5" data-testid="register-form">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Full Name</Label>
            <Input data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5 h-11" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Mobile</Label>
            <Input data-testid="register-mobile-input" type="tel" inputMode="numeric" maxLength={10}
              value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile" className="mt-1.5 h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-600">MPIN</Label>
              <Input data-testid="register-mpin-input" type="password" inputMode="numeric" maxLength={4}
                value={mpin} onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))} placeholder="••••" className="mt-1.5 h-11 tracking-widest" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-600">Confirm</Label>
              <Input data-testid="register-mpin-confirm" type="password" inputMode="numeric" maxLength={4}
                value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} placeholder="••••" className="mt-1.5 h-11 tracking-widest" />
            </div>
          </div>
          <Button type="submit" data-testid="register-submit-btn" disabled={loading} className="w-full h-11 btn-brand">{loading ? "Creating…" : "Create Account"}</Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Already a member? <Link to="/login" className="text-[#FF7A00] font-semibold" data-testid="link-to-login">Login</Link>
        </div>
      </div>
    </div>
  );
}
