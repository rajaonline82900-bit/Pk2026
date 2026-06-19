import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Wallet, BookOpen, Menu, ListChecks, KeyRound,
  LogOut, Share2, User as UserIcon, Trophy,
  Receipt, HelpCircle, Crown, Star, Sparkles
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useAuth } from "../../lib/auth";

// Royal Blue + Yellow theme — Bottom nav
const NAV_ITEMS = [
  { to: "/my-bids",  icon: ListChecks, label: "My Bids" },
  { to: "/passbook", icon: BookOpen,   label: "Passbook" },
  { to: "/",         icon: Home,       label: "Home" },
  { to: "/deposit",  icon: Wallet,     label: "Funds" },
  { to: "/rates",    icon: Star,       label: "Game Rate" },
];

const DRAWER_ITEMS = [
  { to: "/",                    icon: Home,        label: "Home" },
  { to: "/profile",             icon: UserIcon,    label: "My Profile" },
  { to: "/withdraw",            icon: Wallet,      label: "Withdraw Funds" },
  { to: "/my-bids",             icon: ListChecks,  label: "Bid History" },
  { to: "/passbook",            icon: Receipt,     label: "Transaction History" },
  { to: "/my-bids?filter=won",  icon: Trophy,      label: "Win History" },
  { to: "/rates",               icon: Star,        label: "Market Rate" },
  { to: "/refer",               icon: Share2,      label: "Refer & Earn" },
  { to: "/support",             icon: HelpCircle,  label: "Help & Guide" },
  { to: "/mpin",                icon: KeyRound,    label: "Change Password" },
];

export default function MobileLayout({ children, hideBottomNav }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-shell max-w-md mx-auto relative pb-24 min-h-screen bg-slate-50" data-testid="user-shell">
      {/* Premium Royal Blue Header with gold accent line */}
      <header className="sticky top-0 z-40 bg-royal-radial text-white shadow-xl">
        <div className="flex items-center justify-between px-4 h-16 relative">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="open-drawer-btn" className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition active:scale-90">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-white">
                <div className="bg-royal-radial p-6 text-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 pattern-grid opacity-30" />
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gold-gradient text-blue-900 flex items-center justify-center font-display font-black text-2xl mb-2 shadow-xl">
                      <Crown className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <div className="font-display font-black text-xl tracking-tight text-gold-shine">M11 CLUBE</div>
                    <div className="mt-2 text-xs opacity-90" data-testid="drawer-user-name">{user?.name || "Player"}</div>
                    {user?.mobile && <div className="text-xs opacity-80" data-testid="drawer-user-mobile">+91 {user.mobile}</div>}
                    <div className="mt-3 inline-flex items-center gap-2 bg-gold-gradient text-blue-900 px-4 py-1.5 rounded-full shadow-lg font-bold">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm tabular-nums" data-testid="drawer-balance">{user?.wallet_balance ?? 0} pts</span>
                    </div>
                  </div>
                </div>
                <nav className="py-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {DRAWER_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to + label}
                      to={to}
                      onClick={() => setOpen(false)}
                      data-testid={`drawer-link-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      className={`flex items-center gap-3 px-5 py-3 text-sm hover:bg-blue-50 transition border-b border-slate-100 ${location.pathname === to ? "text-blue-700 font-bold bg-blue-50" : "text-slate-700"}`}
                    >
                      <Icon className="w-5 h-5 text-blue-600" />
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
            <Link to="/" className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-400" fill="currentColor" />
              <span className="font-display font-black text-xl tracking-tight text-gold-shine">M11 CLUBE</span>
            </Link>
          </div>
          <Link
            to="/deposit"
            data-testid="header-wallet"
            className="flex items-center gap-2 bg-gold-gradient text-blue-900 px-3.5 py-1.5 rounded-full shadow-lg btn-shine font-bold"
          >
            <Wallet className="w-4 h-4" />
            <span className="text-sm tabular-nums">{user?.wallet_balance ?? 0}</span>
          </Link>
        </div>
        {/* Gold accent line under header */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
      </header>

      {/* Page content */}
      <main className="px-3 py-3" data-testid="page-content">{children}</main>

      {/* Premium Bottom Nav with floating active indicator */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto" data-testid="bottom-nav">
          <div className="mx-3 mb-3 bg-royal-radial rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
            <div className="grid grid-cols-5 py-1.5">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = location.pathname === to || (to === "/" && location.pathname === "/");
                return (
                  <Link
                    key={to + label}
                    to={to}
                    data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex flex-col items-center justify-center py-2 text-[11px] relative"
                  >
                    {active && (
                      <span className="absolute top-1 w-8 h-1 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    )}
                    <Icon className={`w-5 h-5 mb-0.5 transition ${active ? "text-yellow-400 stroke-[2.5]" : "text-white/70"}`} />
                    <span className={`${active ? "text-yellow-400 font-bold" : "text-white/70"}`}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
