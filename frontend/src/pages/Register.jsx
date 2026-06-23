import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { Eye, EyeOff, Gift } from "lucide-react";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = (search.get("ref") || "").trim().toUpperCase();
    if (ref) setRefCode(ref);
  }, [search]);

  const submit = async (e) => {
    e.preventDefault();
    if (name.length < 2) return toast.error("Enter your name");
    if (mobile.length !== 10) return toast.error("Mobile must be 10 digits");
    if (password.length < 4) return toast.error("Password min 4 characters");
    setLoading(true);
    try {
      await register(mobile, name, password, refCode || undefined);
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
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">{t("create_account")}</h1>
          <p className="text-sm text-slate-500 mt-1">Naya account banao</p>
        </div>

        <form onSubmit={submit} className="space-y-3.5" data-testid="register-form" autoComplete="off">
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">{t("full_name")}</Label>
            <Input data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="" className="mt-1.5 h-11" autoComplete="off" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">{t("mobile_number")}</Label>
            <Input data-testid="register-mobile-input" type="tel" inputMode="numeric" maxLength={10}
              value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} placeholder="" className="mt-1.5 h-11" autoComplete="off" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600">{t("password")}</Label>
            <div className="relative mt-1.5">
              <Input data-testid="register-mpin-input" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="" className="h-11 pr-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" tabIndex={-1}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1"><Gift className="w-3 h-3" /> Referral Code (optional)</Label>
            <Input data-testid="register-refcode-input" value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} placeholder="M11XXXXXX" className="mt-1.5 h-11 font-mono tracking-widest" autoComplete="off" />
            {refCode && <div className="text-xs text-emerald-600 mt-1">✓ You'll be referred by {refCode}</div>}
          </div>
          <Button type="submit" data-testid="register-submit-btn" disabled={loading} className="w-full h-11 btn-brand">{loading ? "…" : t("signup_btn")}</Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {t("already_member")} <Link to="/login" className="text-[#FF7A00] font-semibold" data-testid="link-to-login">{t("login_btn")}</Link>
        </div>
      </div>
    </div>
  );
}
