import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { Copy, Share2, Users, Trophy, Gift, IndianRupee, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function ReferEarn() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { api.get("/users/me/referral").then(r => setData(r.data)); }, []);

  const shareUrl = data?.referral_code
    ? `${window.location.origin}/login?ref=${data.referral_code}`
    : "";
  const shareText = `🎰 Raja Khaiwal join karo aur jeeto bada! Mere referral code "${data?.referral_code}" se signup karke pehli deposit karo. Link: ${shareUrl}`;

  const copyCode = () => {
    if (!data?.referral_code) return;
    navigator.clipboard.writeText(data.referral_code);
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareNow = async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({ title: "Raja Khaiwal", text: shareText, url: shareUrl });
      } catch (e) {/* user cancelled */}
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Share message copied to clipboard");
    }
  };

  const waShare = () => {
    if (!shareUrl) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  return (
    <MobileLayout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 rounded-2xl p-5 text-white text-center mb-4 shadow-lg" data-testid="refer-hero">
        <Gift className="w-12 h-12 mx-auto mb-2" strokeWidth={1.8} />
        <div className="font-display font-bold text-2xl">Refer & Earn</div>
        <div className="text-sm opacity-90 mt-1">Invite friends. Earn {data?.percent ?? 10}% of their first deposit!</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat Icon={Users} label="Referred" value={data?.referred_count ?? 0} color="text-sky-600" testid="stat-referred" />
        <Stat Icon={Trophy} label="Active" value={data?.converted_count ?? 0} color="text-emerald-600" testid="stat-converted" />
        <Stat Icon={IndianRupee} label="Earned" value={`₹${data?.total_earned ?? 0}`} color="text-orange-600" testid="stat-earned" />
      </div>

      {/* Referral Code */}
      <div className="bg-white border-2 border-dashed border-[#0f7a6a] rounded-xl p-4 mb-3 text-center" data-testid="referral-code-box">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Your Referral Code</div>
        <div className="font-display font-bold text-3xl text-[#0f7a6a] tracking-widest mt-1 mb-3" data-testid="referral-code-value">{data?.referral_code || "..."}</div>
        <button onClick={copyCode} className="inline-flex items-center gap-2 bg-[#0f7a6a] text-white px-5 py-2 rounded-lg font-semibold active:scale-95 transition" data-testid="copy-code-btn">
          {copied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
        </button>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={shareNow} className="bg-gradient-to-br from-[#0f7a6a] to-emerald-600 text-white font-bold py-3 rounded-xl shadow active:scale-95 transition flex items-center justify-center gap-2" data-testid="share-now-btn">
          <Share2 className="w-5 h-5" /> Share Now
        </button>
        <button onClick={waShare} className="bg-gradient-to-br from-[#25D366] to-emerald-700 text-white font-bold py-3 rounded-xl shadow active:scale-95 transition flex items-center justify-center gap-2" data-testid="share-whatsapp-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
          WhatsApp
        </button>
      </div>

      {/* How it works */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4" data-testid="how-it-works">
        <div className="font-bold text-slate-900 mb-2">How it works</div>
        <ol className="space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><span className="w-6 h-6 rounded-full bg-[#0f7a6a] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span><span>Apna referral code apne dosto ke saath share karo</span></li>
          <li className="flex gap-2"><span className="w-6 h-6 rounded-full bg-[#0f7a6a] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span><span>Friend signup karte time aapka code lagaaye</span></li>
          <li className="flex gap-2"><span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span><span>Jab woh <strong>pehli deposit</strong> kare, aapko uska <strong>{data?.percent ?? 10}%</strong> milega 🎁</span></li>
          <li className="flex gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shrink-0">4</span><span>Bonus turant aapke wallet mein credit ho jaata hai</span></li>
        </ol>
      </div>

      <div className="text-center text-xs text-slate-400 mb-2">Unlimited referrals · {data?.percent ?? 10}% commission on first deposit only</div>
    </MobileLayout>
  );
}

function Stat({ Icon, label, value, color, testid }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 text-center" data-testid={testid}>
      <Icon className={`w-5 h-5 mx-auto ${color}`} />
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">{label}</div>
      <div className={`font-display font-bold text-lg mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
