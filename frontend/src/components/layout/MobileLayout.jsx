import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Wallet, BookOpen, Menu, ListChecks, KeyRound,
  LogOut, Share2, User as UserIcon, Trophy,
  Receipt, HelpCircle, Sparkles, Star, RefreshCw, Gem
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useAuth } from "../../lib/auth";

// Bottom nav: Refer & Earn replaces Fund
const NAV_ITEMS = [
  { to: "/my-bids",  icon: ListChecks, label: "My Bids" },
  { to: "/passbook", icon: BookOpen,   label: "Passbook" },
  { to: "/",         icon: Home,       label: "Home" },
  { to: "/refer",    icon: Share2,     label: "Refer & Earn" },
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
    <div className="mobile-shell max-w-md mx-auto relative pb-28 min-h-screen jl-radial-bg text-[color:var(--jl-text)]" data-testid="user-shell">
      {/* Jade Ledger Header — obsidian glass with subtle jade underline */}
      <header className="sticky top-0 z-40 glass-panel border-x-0 border-t-0 backdrop-saturate-150">
        <div className="flex items-center justify-between px-4 h-16 relative">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="open-drawer-btn" className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition active:scale-90 text-[color:var(--jl-text)]">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-obsidian-900 border-r border-[color:var(--jl-border)] text-[color:var(--jl-text)]">
                <div className="jl-radial-bg p-6 text-center relative overflow-hidden border-b border-[color:var(--jl-border)]">
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto rounded-2xl glass-panel flex items-center justify-center mb-2 ring-1 ring-jade-500/40">
                      <Gem className="w-8 h-8 text-jade-400" strokeWidth={1.75} />
                    </div>
                    <div className="font-serif font-black text-2xl tracking-tight luxury-gradient-text">M11 CLUBE</div>
                    <div className="mt-2 text-xs text-[color:var(--jl-text-muted)]" data-testid="drawer-user-name">{user?.name || "Player"}</div>
                    {user?.mobile && <div className="text-xs text-[color:var(--jl-text-muted)]" data-testid="drawer-user-mobile">+91 {user.mobile}</div>}
                    <div className="mt-3 inline-flex items-center gap-2 bg-jade-500 text-obsidian-900 px-4 py-1.5 rounded-full shadow-lg font-bold tactile-btn">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm tabular-nums font-money" data-testid="drawer-balance">₹{user?.wallet_balance ?? 0}</span>
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
                      className={`flex items-center gap-3 px-5 py-3 text-sm transition border-b border-[color:var(--jl-border)] ${location.pathname === to ? "text-jade-400 font-bold bg-jade-500/10" : "text-[color:var(--jl-text)] hover:bg-white/5"}`}
                    >
                      <Icon className={`w-5 h-5 ${location.pathname === to ? "text-jade-400" : "text-[color:var(--jl-text-muted)]"}`} strokeWidth={1.75} />
                      <span className="text-base">{label}</span>
                    </Link>
                  ))}
                  <button
                    data-testid="drawer-logout-btn"
                    onClick={() => { logout(); setOpen(false); navigate("/login"); }}
                    className="w-full text-left flex items-center gap-3 px-5 py-3 text-base hover:bg-rose-500/10 text-rose-400 transition border-b border-[color:var(--jl-border)]"
                  >
                    <LogOut className="w-5 h-5" strokeWidth={1.75} />
                    <span>Logout</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex items-center gap-2">
              <Gem className="w-6 h-6 text-jade-400" fill="currentColor" fillOpacity={0.15} strokeWidth={1.75} />
              <span className="font-serif font-black text-2xl tracking-tight luxury-gradient-text">M11 CLUBE</span>
            </Link>
          </div>
          <Link
            to="/deposit"
            data-testid="header-wallet"
            className="flex items-center gap-2 btn-jade px-3.5 py-1.5 rounded-full shadow-lg tactile-btn"
          >
            <Wallet className="w-4 h-4" strokeWidth={2} />
            <span className="text-sm font-money tabular-nums">₹{user?.wallet_balance ?? 0}</span>
          </Link>
        </div>
        {/* Jade underline */}
        <div className="h-px bg-gradient-to-r from-transparent via-jade-500/60 to-transparent" />
      </header>

      {/* Page content */}
      <main className="px-3 py-4 relative z-10" data-testid="page-content">{children}</main>

      {/* Floating Refresh Button — jade */}
      <button
        onClick={() => window.location.reload()}
        data-testid="refresh-btn"
        aria-label="Refresh"
        className="fixed right-4 bottom-28 z-[55] w-12 h-12 rounded-full btn-jade shadow-2xl tactile-btn flex items-center justify-center ring-2 ring-jade-500/30"
      >
        <RefreshCw className="w-5 h-5" strokeWidth={2.25} />
      </button>

      {/* Floating Island Bottom Nav — obsidian glass */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto" data-testid="bottom-nav">
          <div className="mx-3 mb-3 glass-panel rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="h-px bg-gradient-to-r from-transparent via-jade-500/50 to-transparent" />
            <div className="grid grid-cols-5 py-1.5">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                const active = location.pathname === to || (to === "/" && location.pathname === "/");
                return (
                  <Link
                    key={to + label}
                    to={to}
                    data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex flex-col items-center justify-center py-2 text-[11px] relative tactile-btn"
                  >
                    {active && (
                      <span className="absolute top-1 w-8 h-1 rounded-full bg-jade-400 shadow-[0_0_10px_rgba(51,217,156,0.7)]" />
                    )}
                    <Icon className={`w-5 h-5 mb-0.5 transition ${active ? "text-jade-400 stroke-[2.25]" : "text-[color:var(--jl-text-muted)]"}`} />
                    <span className={`${active ? "text-jade-400 font-bold" : "text-[color:var(--jl-text-muted)]"}`}>{label}</span>
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
