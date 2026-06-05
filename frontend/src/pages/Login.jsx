import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { Lock, Phone } from "lucide-react";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10 || mpin.length !== 4) {
      toast.error("Enter a 10-digit mobile and 4-digit MPIN");
      return;
    }
    setLoading(true);
    try {
      await login(mobile, mpin);
      toast.success("Welcome back!");
      navigate("/");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white font-display font-bold text-2xl mb-4 shadow-lg shadow-orange-100">M11</div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">M11 CLUBE</h1>
          <p className="text-sm text-slate-500 mt-1">India's most trusted Matka platform</p>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="login-form">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Mobile Number</Label>
            <div className="relative mt-1.5">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                data-testid="login-mobile-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="9876543210"
                className="pl-9 h-11"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">4-digit MPIN</Label>
            <div className="relative mt-1.5">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                data-testid="login-mpin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="pl-9 h-11 tracking-widest"
              />
            </div>
          </div>
          <Button
            type="submit"
            data-testid="login-submit-btn"
            disabled={loading}
            className="w-full h-11 btn-brand"
          >{loading ? "Signing in…" : "Login"}</Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          New here? <Link to="/register" className="text-[#FF7A00] font-semibold" data-testid="link-to-register">Create account</Link>
        </div>
        <div className="mt-3 text-center text-xs text-slate-400">
          <Link to="/admin/login" data-testid="link-to-admin-login" className="hover:text-slate-600">Admin login →</Link>
        </div>
      </div>
    </div>
  );
}
