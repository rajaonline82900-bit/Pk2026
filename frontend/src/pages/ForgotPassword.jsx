import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api, formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast, Toaster } from "sonner";
import { ArrowLeft, ShieldQuestion } from "lucide-react";

export default function ForgotPassword() {
  const { setSessionFromResetToken } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (mobile.length !== 10) return toast.error("Enter 10-digit mobile");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-otp", { mobile });
      setOtpId(data.otp_id);
      if (data.demo_otp) {
        setDemoOtp(data.demo_otp);
        toast.message(`Demo OTP: ${data.demo_otp}`, { description: "SMS provider not configured — using demo mode" });
      } else {
        toast.success("OTP sent to your mobile");
      }
      setStep(2);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const reset = async () => {
    if (otp.length < 4) return toast.error("Enter OTP");
    if (newPw.length < 4) return toast.error("Password min 4 characters");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { otp_id: otpId, otp, new_password: newPw });
      setSessionFromResetToken(data.token, data.user);
      toast.success("Password reset successful");
      navigate("/");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10">
      <Toaster richColors position="top-center" />
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Back to login</Link>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mb-3"><ShieldQuestion className="w-7 h-7" /></div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1">{step === 1 ? "Enter your registered mobile" : "Enter OTP and new password"}</p>
        </div>

        {step === 1 ? (
          <div className="space-y-3" data-testid="forgot-step1">
            <Label className="text-xs uppercase tracking-wider text-slate-600">Mobile Number</Label>
            <Input data-testid="forgot-mobile" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} className="h-11" />
            <Button data-testid="forgot-send-otp" onClick={sendOtp} disabled={loading} className="w-full h-11 btn-brand">{loading ? "…" : "Send OTP"}</Button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="forgot-step2">
            {demoOtp && <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg p-2 text-center">Demo OTP: <span className="font-mono font-semibold">{demoOtp}</span></div>}
            <Label className="text-xs uppercase tracking-wider text-slate-600">OTP</Label>
            <Input data-testid="forgot-otp-input" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="h-11 tracking-widest text-center text-lg font-semibold" />
            <Label className="text-xs uppercase tracking-wider text-slate-600 pt-2">New Password</Label>
            <Input data-testid="forgot-new-password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-11" />
            <Button data-testid="forgot-reset-btn" onClick={reset} disabled={loading} className="w-full h-11 btn-brand">{loading ? "…" : "Reset & Sign in"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
