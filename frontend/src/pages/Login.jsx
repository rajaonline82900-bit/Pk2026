import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { Lock, Phone, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10) return toast.error("Enter 10-digit mobile");
    if (password.length < 4) return toast.error("Enter password");
    setLoading(true);
    try {
      await login(mobile, password);
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
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{t("login_title")}</h1>
          <p className="text-sm text-slate-500 mt-1">M11 CLUBE</p>
        </div>

        <form onSubmit={submit} className="space-y-4" data-testid="login-form" autoComplete="off">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">{t("mobile_number")}</Label>
            <div className="relative mt-1.5">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                data-testid="login-mobile-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder=""
                autoComplete="off"
                className="pl-9 h-11"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">{t("password")}</Label>
            <div className="relative mt-1.5">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                data-testid="login-mpin-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="new-password"
                className="pl-9 pr-10 h-11"
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" tabIndex={-1}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right mt-2">
              <Link to="/forgot-password" data-testid="link-forgot" className="text-xs text-[#FF7A00] font-semibold">{t("forgot_password")}</Link>
            </div>
          </div>
          <Button
            type="submit"
            data-testid="login-submit-btn"
            disabled={loading}
            className="w-full h-11 btn-brand"
          >{loading ? "…" : t("login_btn")}</Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {t("new_here")} <Link to="/register" className="text-[#FF7A00] font-semibold" data-testid="link-to-register">{t("signup_btn")}</Link>
        </div>
        <div className="mt-3 text-center text-xs text-slate-400">
          <Link to="/admin/login" data-testid="link-to-admin-login" className="hover:text-slate-600">Admin login →</Link>
        </div>
      </div>
    </div>
  );
}
