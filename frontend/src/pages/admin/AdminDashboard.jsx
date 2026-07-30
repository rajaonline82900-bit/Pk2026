import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";
import { Users, ListChecks, Wallet, TrendingUp, ArrowDownToLine, ArrowUpFromLine, UserPlus } from "lucide-react";

const stats = [
  { key: "total_users", label: "Total Users", icon: Users, color: "bg-blue-50 text-blue-700" },
  { key: "total_bids", label: "Total Bids", icon: ListChecks, color: "bg-violet-50 text-violet-700" },
  { key: "live_balance", label: "Live Wallet Balance", icon: Wallet, color: "bg-emerald-50 text-emerald-700" },
  { key: "today_collection", label: "Today's Collection", icon: TrendingUp, color: "bg-amber-50 text-amber-700" },
  { key: "pending_withdrawals", label: "Pending Withdrawals", icon: ArrowUpFromLine, color: "bg-rose-50 text-rose-700" },
  { key: "pending_deposits", label: "Pending Deposits", icon: ArrowDownToLine, color: "bg-orange-50 text-orange-700" },
];

const AVATAR_COLORS = [
  "from-pink-500 to-rose-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-indigo-600",
  "from-sky-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-fuchsia-500 to-rose-600",
];

export default function AdminDashboard() {
  const [data, setData] = useState({});
  const [daily, setDaily] = useState({ count: 0, users: [] });

  useEffect(() => {
    api.get("/admin/dashboard").then(({data}) => setData(data));
    api.get("/daily-joined-users?limit=50").then(({ data }) => setDaily(data)).catch(() => {});
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Overview</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

      {/* Daily Joined Users — admin only */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" data-testid="daily-users-card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-emerald-700 font-bold">Last 24 Hours</div>
              <h2 className="font-bold text-lg text-slate-900">Recently Joined Users</h2>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-display font-black text-emerald-600 tabular-nums leading-none" data-testid="daily-users-count">{daily.count || 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">New Users</div>
          </div>
        </div>

        {(!daily.users || daily.users.length === 0) ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No new signups in last 24 hours.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto" data-testid="daily-users-list">
            {daily.users.map((u, i) => (
              <li key={u.id || i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50" data-testid={`daily-user-row-${i}`}>
                <div className={`w-10 h-10 rounded-full text-white font-black flex items-center justify-center shadow bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {(u.name || "P").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">🎉 {u.name}</div>
                  <div className="text-xs text-slate-500">
                    Joined {u.joined_at ? new Date(u.joined_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "recently"}
                  </div>
                </div>
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase tracking-widest shrink-0">New</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
