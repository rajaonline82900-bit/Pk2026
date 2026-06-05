import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { Bell } from "lucide-react";

export default function Notifications() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notifications").then(({data}) => setItems(data)); }, []);
  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">Notifications</h1>
      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <div className="text-sm">No notifications yet</div>
        </div>
      ) : (
        <div className="space-y-2" data-testid="notifications-list">
          {items.map(n => (
            <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`notification-${n.id}`}>
              <div className="font-display font-semibold text-slate-900 text-sm">{n.title}</div>
              <div className="text-xs text-slate-600 mt-1">{n.body}</div>
              <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  );
}
