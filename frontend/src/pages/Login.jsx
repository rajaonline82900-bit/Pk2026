import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast, Toaster } from "sonner";
import { Lock, Phone, Eye, EyeOff, LogIn, ShieldCheck, MessageCircle } from "lucide-react";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10) return toast.error("10-digit mobile number daalein");
    if (password.length < 4) return toast.error("Password daalein");
    setLoading(true);
    try {
      await login(mobile, password);
      navigate("/");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-start px-5 pt-8 pb-10"
      style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, #1e40af 0%, #0c1e5e 45%, #060f36 100%)" }}
      data-testid="login-page">
      <Toaster richColors position="top-center" />

      {/* Ambient gold glow orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.55), transparent 60%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] pattern-grid" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-70"
              style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)" }} />
            <img src="/brand/raja-khaiwal-logo.png" alt="Raja Khaiwal"
              className="relative w-28 h-28 rounded-full ring-2 ring-yellow-400/60 shadow-[0_0_40px_rgba(251,191,36,0.55)] object-cover"
              data-testid="brand-logo" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-black text-3xl tracking-tight text-gold-shine">RAJA <span className="text-yellow-300">KHAIWAL</span></h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-yellow-400/70 text-yellow-300 tracking-widest">ROYAL</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/40 bg-blue-900/40 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-semibold text-blue-100 tracking-wide">Official Gaming & Bidding Network</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl p-4 border border-yellow-400/25 shadow-[0_20px_60px_-15px_rgba(251,191,36,0.25)]"
          style={{ background: "linear-gradient(180deg, rgba(15,32,88,0.85) 0%, rgba(8,20,60,0.9) 100%)", backdropFilter: "blur(12px)" }}>
          {/* Tab Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-full bg-blue-950/70 border border-yellow-400/15 mb-5">
            <button type="button" className="h-11 rounded-full font-bold text-sm tracking-wider text-slate-900"
              style={{ background: "linear-gradient(180deg, #fde047, #f59e0b)", boxShadow: "0 6px 20px rgba(251,191,36,0.45)" }}
              data-testid="tab-login">LOGIN</button>
            <button type="button" onClick={() => navigate("/register")} className="h-11 rounded-full font-bold text-sm tracking-wider text-slate-300 hover:text-yellow-300 transition"
              data-testid="tab-register">REGISTRATION</button>
          </div>

          <form onSubmit={submit} className="space-y-4" data-testid="login-form" autoComplete="off">
            <FieldLabel>MOBILE NUMBER</FieldLabel>
            <FieldWrap icon={<Phone className="w-4 h-4" />}>
              <input
                data-testid="login-mobile-input"
                type="tel" inputMode="numeric" maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                autoComplete="off"
                className="w-full h-12 bg-transparent text-yellow-50 placeholder-slate-500 pl-11 pr-3 rounded-2xl outline-none"
              />
            </FieldWrap>

            <FieldLabel>PASSWORD</FieldLabel>
            <FieldWrap icon={<Lock className="w-4 h-4" />}>
              <input
                data-testid="login-mpin-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                className="w-full h-12 bg-transparent text-yellow-50 placeholder-slate-500 pl-11 pr-11 rounded-2xl outline-none"
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-300" tabIndex={-1} data-testid="toggle-pw">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </FieldWrap>

            <div className="text-right -mt-1">
              <Link to="/forgot-password" data-testid="link-forgot" className="text-xs text-yellow-300 font-semibold hover:underline">Password bhool gaye?</Link>
            </div>

            <button type="submit" disabled={loading} data-testid="login-submit-btn"
              className="w-full h-14 rounded-2xl font-black text-base tracking-wider text-slate-900 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(180deg, #fde047 0%, #f59e0b 100%)", boxShadow: "0 10px 30px rgba(251,191,36,0.45), inset 0 1px 0 rgba(255,255,255,0.5)" }}>
              {loading ? "…" : (<><span>LOGIN</span><LogIn className="w-5 h-5" /></>)}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-300">
            खाता नहीं है? <Link to="/register" className="text-yellow-300 font-bold underline underline-offset-4 decoration-yellow-400/70" data-testid="link-to-register">नया अकाउंट बनाएं</Link>
          </div>
        </div>

        {/* Helpline pill */}
        <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer"
          className="mt-5 mx-auto flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 text-sm font-semibold w-fit"
          data-testid="btn-helpline">
          <MessageCircle className="w-4 h-4" />
          Contact 24/7 Helpline
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </a>

        <div className="mt-4 text-center">
          <Link to="/admin/login" data-testid="link-to-admin-login" className="text-[11px] text-slate-500 hover:text-yellow-300">Admin login →</Link>
        </div>
      </div>
    </div>
  );
}

const FieldLabel = ({ children }) => (
  <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400 pl-1">{children}</div>
);

const FieldWrap = ({ icon, children }) => (
  <div className="relative rounded-2xl border border-yellow-400/20 bg-blue-950/60 focus-within:border-yellow-400/70 transition">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400">{icon}</span>
    {children}
  </div>
);
