import React, { useEffect, useState } from "react";
import MobileLayout from "../components/layout/MobileLayout";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/bids/me").then(({data}) => setBids(data)).finally(()=>setLoading(false)); }, []);

  const tabs = [
    { key: "all", label: "All", filter: () => true },
    { key: "pending", label: "Pending", filter: (b) => b.status === "pending" },
    { key: "won", label: "Won", filter: (b) => b.status === "won" },
    { key: "lost", label: "Lost", filter: (b) => b.status === "lost" },
  ];

  return (
    <MobileLayout>
      <h1 className="font-display font-bold text-2xl tracking-tight text-slate-900 mb-3">My Bids</h1>
      <Tabs defaultValue="all" data-testid="my-bids-tabs">
        <TabsList className="grid grid-cols-4 bg-slate-100 mb-3">
          {tabs.map(t => <TabsTrigger key={t.key} value={t.key} data-testid={`tab-${t.key}`}>{t.label}</TabsTrigger>)}
        </TabsList>
        {tabs.map(t => (
          <TabsContent key={t.key} value={t.key}>
            {loading ? <Skeleton /> : (
              <div className="space-y-2" data-testid={`bids-list-${t.key}`}>
                {bids.filter(t.filter).length === 0 ? <Empty /> :
                  bids.filter(t.filter).map(b => (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3" data-testid={`bid-${b.id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900 text-sm">{b.market_name}</div>
                          <div className="text-xs text-slate-500">{b.game_name} · {b.session || "-"}</div>
                        </div>
                        <div className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 rounded-md border ${statusStyles[b.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{b.status}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <div className="font-mono tracking-widest font-semibold text-slate-900">{b.number}</div>
                        <div className="text-slate-500">Bid: <span className="tabular-nums text-slate-900 font-semibold">{b.amount}</span> · Win: <span className="tabular-nums font-semibold text-emerald-600">{b.win_amount || 0}</span></div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{new Date(b.created_at).toLocaleString()}</div>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </MobileLayout>
  );
}

const Skeleton = () => <div className="space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>;
const Empty = () => <div className="text-center py-12 text-slate-400 text-sm">No bids yet</div>;
