import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";

const typeStyles = {
  deposit: "bg-emerald-50 text-emerald-700",
  withdraw: "bg-rose-50 text-rose-700",
  bid: "bg-slate-50 text-slate-700",
  win: "bg-amber-50 text-amber-700",
  bonus: "bg-violet-50 text-violet-700",
  admin_adjust: "bg-blue-50 text-blue-700",
};

export default function Passbook() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/wallet/passbook").then(({data}) => setTxns(data)).finally(()=>setLoading(false)); }, []);

  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Passbook</h1>
      {loading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : txns.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">No transactions yet</div>
      ) : (
        <div className="space-y-2" data-testid="passbook-list">
          {txns.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between" data-testid={`txn-${t.id}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md ${typeStyles[t.type] || "bg-slate-50 text-slate-600"}`}>{t.type.replace("_"," ")}</span>
                  <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-md ${t.status === "approved" ? "bg-emerald-50 text-emerald-700" : t.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{t.status}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">{t.note}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div className={`tabular-nums font-display font-bold text-base ${t.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{t.amount >= 0 ? "+" : ""}{t.amount}</div>
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  );
}
