import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const { adminLogin, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success("Welcome, Admin");
      navigate("/admin");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-tight text-slate-900">RAJA KHAIWAL</div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Admin Console</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4" data-testid="admin-login-form">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Email</Label>
            <Input data-testid="admin-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@m11clube.com" className="mt-1.5 h-11" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">Password</Label>
            <Input data-testid="admin-login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 h-11" />
          </div>
          <Button type="submit" data-testid="admin-login-submit" disabled={loading} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white">{loading ? "Signing in…" : "Sign in to Admin"}</Button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">
          Not an admin? <a href="/login" className="text-slate-600 hover:text-slate-900">Go to user app →</a>
        </div>
      </div>
    </div>
  );
}
