import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, Wallet, Settings, Megaphone, ListChecks, LogOut, Layers, BarChart3 } from "lucide-react";
import { useAuth } from "../../lib/auth";

const ITEMS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/markets", icon: Layers, label: "Markets" },
  { to: "/admin/results", icon: Calendar, label: "Results" },
  { to: "/admin/jantri", icon: BarChart3, label: "Jantri Report" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/payments", icon: Wallet, label: "Payments" },
  { to: "/admin/bids", icon: ListChecks, label: "All Bids" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="font-display font-bold text-xl tracking-tight text-slate-900">M11 <span className="text-[#FF7A00]">CLUBE</span></div>
          <div className="text-[11px] uppercase tracking-widest text-slate-400 mt-1">Admin Console</div>
        </div>
        <nav className="flex-1 py-4">
          {ITEMS.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? loc.pathname === to : loc.pathname === to || loc.pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} data-testid={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition ${active ? "bg-orange-50 text-[#FF7A00] border-r-2 border-[#FF7A00] font-medium" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-900" data-testid="admin-username">{admin?.name || admin?.email}</div>
          <div className="text-xs text-slate-500">{admin?.email}</div>
          <button data-testid="admin-logout-btn" onClick={() => { logout(); navigate("/admin/login"); }}
            className="mt-3 w-full flex items-center justify-center gap-2 text-sm border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 py-2 rounded-lg transition">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8" data-testid="admin-content">{children}</div>
      </main>
    </div>
  );
}
