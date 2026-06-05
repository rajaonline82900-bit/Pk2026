import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { api } from "../../lib/api";

const styles = {
  pending: "bg-amber-50 text-amber-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-rose-50 text-rose-700",
};

export default function AdminBids() {
  const [bids, setBids] = useState([]);
  useEffect(() => { api.get("/admin/bids").then(({data})=>setBids(data)); }, []);
  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold">Activity</div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900 mt-1">All Bids</h1>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Market</th>
              <th className="text-left px-4 py-3">Game</th>
              <th className="text-left px-4 py-3">Session</th>
              <th className="text-left px-4 py-3">Number</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-right px-4 py-3">Win</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody data-testid="admin-bids-table">
            {bids.map(b => (
              <tr key={b.id} className="border-t border-slate-100" data-testid={`bid-${b.id}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{b.market_name}</td>
                <td className="px-4 py-3 text-slate-600">{b.game_name}</td>
                <td className="px-4 py-3 text-slate-600 uppercase text-xs">{b.session || "—"}</td>
                <td className="px-4 py-3 font-mono">{b.number}</td>
                <td className="px-4 py-3 text-right tabular-nums">{b.amount}</td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{b.win_amount || 0}</td>
                <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-md ${styles[b.status] || "bg-slate-50 text-slate-600"}`}>{b.status}</span></td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(b.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {bids.length === 0 && <tr><td colSpan="8" className="text-center py-12 text-slate-400">No bids yet</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
