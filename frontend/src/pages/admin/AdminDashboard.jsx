import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { Users, ListChecks, Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const stats = [
  { key: "total_users", label: "Total Users", icon: Users, color: "bg-blue-50 text-blue-700" },
  { key: "total_bids", label: "Total Bids", icon: ListChecks, color: "bg-violet-50 text-violet-700" },
  { key: "live_balance", label: "Live Wallet Balance", icon: Wallet, color: "bg-emerald-50 text-emerald-700" },
  { key: "today_collection", label: "Today's Collection", icon: TrendingUp, color: "bg-amber-50 text-amber-700" },
  { key: "pending_withdrawals", label: "Pending Withdrawals", icon: ArrowUpFromLine, color: "bg-rose-50 text-rose-700" },
  { key: "pending_deposits", label: "Pending Deposits", icon: ArrowDownToLine, color: "bg-orange-50 text-orange-700" },
];

export default function AdminDashboard() {
  const [data, setData] = useState({});
  useEffect(() => { api.get("/admin/dashboard").then(({data}) => setData(data)); }, []);
  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Overview</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Dashboard</h1>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition" data-testid={`stat-${s.key}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}><Icon className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-display font-semibold tabular-nums text-slate-900">{data[s.key] ?? 0}</div>
              <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
