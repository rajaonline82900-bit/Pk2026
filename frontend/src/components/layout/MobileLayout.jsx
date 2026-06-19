import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Wallet, BookOpen, Menu, Bell, ListChecks, KeyRound,
  LogOut, Share2, Settings, Star, User as UserIcon, Trophy,
  Receipt, HelpCircle, Send
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useAuth } from "../../lib/auth";

// Bottom nav matches Raj Shree style: My Bids | Passbook | Home | Funds | Game Rate
const NAV_ITEMS = [
  { to: "/my-bids",  icon: ListChecks, label: "My Bids" },
  { to: "/passbook", icon: BookOpen,   label: "Passbook" },
  { to: "/",         icon: Home,       label: "Home" },
  { to: "/deposit",  icon: Wallet,     label: "Funds" },
  { to: "/rates",    icon: Star,       label: "Game Rate" },
];

const DRAWER_ITEMS = [
  { to: "/",                  icon: Home,        label: "Home" },
  { to: "/profile",           icon: UserIcon,    label: "My Profile" },
  { to: "/withdraw",          icon: Wallet,      label: "Withdraw Funds" },
  { to: "/my-bids",           icon: ListChecks,  label: "Bid History" },
  { to: "/passbook",          icon: Receipt,     label: "Transaction History" },
  { to: "/my-bids?filter=won",icon: Trophy,      label: "Win History" },
  { to: "/rates",              icon: Star,       label: "Market Rate" },
  { to: "/refer",              icon: Share2,     label: "Refer & Earn" },
  { to: "/support",            icon: HelpCircle, label: "Help & Guide" },
  { to: "/mpin",               icon: KeyRound,   label: "Change Password" },
];

export default function MobileLayout({ children, hideBottomNav }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-shell max-w-md mx-auto relative pb-24 bg-slate-50 min-h-screen" data-testid="user-shell">
      {/* Teal Header */}
      <header className="sticky top-0 z-40 bg-[#0f7a6a] text-white shadow">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="open-drawer-btn" className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-white">
                <div className="p-6 bg-[#0f7a6a] text-white text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white text-[#0f7a6a] flex items-center justify-center font-display font-bold text-xl mb-2">M11</div>
                  <div className="font-display font-bold text-lg tracking-tight">M11 CLUBE</div>
                  <div className="mt-2 text-xs opacity-90" data-testid="drawer-user-name">{user?.name || "Player"}</div>
                  {user?.mobile && <div className="text-xs opacity-80" data-testid="drawer-user-mobile">+91 {user.mobile}</div>}
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-lg">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-semibold tabular-nums" data-testid="drawer-balance">{user?.wallet_balance ?? 0} pts</span>
                  </div>
                </div>
                <nav className="py-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {DRAWER_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to + label}
                      to={to}
                      onClick={() => setOpen(false)}
                      data-testid={`drawer-link-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      className={`flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50 transition border-b border-slate-100 ${location.pathname === to ? "text-[#0f7a6a] font-semibold" : "text-slate-700"}`}
                    >
                      <Icon className="w-5 h-5 text-[#0f7a6a]" />
                      <span className="text-base">{label}</span>
                    </Link>
                  ))}
                  <button
                    data-testid="drawer-logout-btn"
                    onClick={() => { logout(); setOpen(false); navigate("/login"); }}
                    className="w-full text-left flex items-center gap-3 px-5 py-3 text-base hover:bg-red-50 text-red-600 transition border-b border-slate-100"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="font-display font-bold text-lg tracking-tight">M11 CLUBE</Link>
          </div>
          <Link
            to="/deposit"
            data-testid="header-wallet"
            className="flex items-center gap-2 bg-white text-slate-900 px-3 py-1.5 rounded-md shadow-sm"
          >
            <Wallet className="w-4 h-4 text-[#0f7a6a]" />
            <span className="text-sm font-bold tabular-nums">{user?.wallet_balance ?? 0}</span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="px-3 py-3" data-testid="page-content">{children}</main>

      {/* Bottom Nav */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto bg-white border-t border-slate-200 shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.05)]" data-testid="bottom-nav">
          <div className="grid grid-cols-5">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname === to || (to === "/" && location.pathname === "/");
              return (
                <Link
                  key={to + label}
                  to={to}
                  data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex flex-col items-center justify-center py-2.5 text-[11px] transition ${active ? "text-[#0f7a6a] font-semibold" : "text-slate-500"}`}
                >
                  <Icon className={`w-5 h-5 mb-0.5 ${active ? "stroke-[2.5]" : ""}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
