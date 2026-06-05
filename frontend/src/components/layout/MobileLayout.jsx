import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home, Wallet, Headphones, ScrollText, BookOpen, Menu, Bell, MessageCircle,
  ListChecks, Receipt, KeyRound, FileVideo, Settings, LogOut, Share2,
  Shield, BarChart3, Lightbulb, Megaphone
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useAuth } from "../../lib/auth";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/my-bids", icon: ListChecks, label: "My Bids" },
  { to: "/passbook", icon: BookOpen, label: "Passbook" },
  { to: "/funds", icon: Wallet, label: "Funds" },
  { to: "/support", icon: Headphones, label: "Support" },
];

const DRAWER_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/my-bids", icon: ListChecks, label: "My Bids" },
  { to: "/mpin", icon: KeyRound, label: "MPIN Management" },
  { to: "/passbook", icon: BookOpen, label: "Passbook" },
  { to: "/support", icon: MessageCircle, label: "Live Chat" },
  { to: "/funds", icon: Wallet, label: "Funds" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/tutorials", icon: FileVideo, label: "Video Tutorials" },
  { to: "/notice", icon: ScrollText, label: "Notice Board" },
  { to: "/rates", icon: Megaphone, label: "Game Rates" },
  { to: "/charts", icon: BarChart3, label: "Charts" },
  { to: "/idea", icon: Lightbulb, label: "Submit Idea" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/share", icon: Share2, label: "Share App" },
];

export default function MobileLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-shell max-w-md mx-auto relative pb-20" data-testid="user-shell">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button data-testid="open-drawer-btn" className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition">
                  <Menu className="w-5 h-5 text-slate-700" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 bg-white">
                <div className="p-5 bg-gradient-to-br from-[#FF7A00] to-[#F5A623] text-white">
                  <div className="font-display font-bold text-xl tracking-tight">M11 CLUBE</div>
                  <div className="mt-3 text-sm opacity-90" data-testid="drawer-user-name">{user?.name}</div>
                  <div className="text-xs opacity-80" data-testid="drawer-user-mobile">+91 {user?.mobile}</div>
                  <div className="mt-3 inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-lg">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-semibold tabular-nums" data-testid="drawer-balance">{user?.wallet_balance ?? 0} pts</span>
                  </div>
                </div>
                <nav className="py-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {DRAWER_ITEMS.map(({ to, icon: Icon, label }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setOpen(false)}
                      data-testid={`drawer-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`flex items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50 transition ${location.pathname === to ? "text-[#FF7A00] font-medium" : "text-slate-700"}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </Link>
                  ))}
                  <button
                    data-testid="drawer-logout-btn"
                    onClick={() => { logout(); setOpen(false); navigate("/login"); }}
                    className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm hover:bg-red-50 text-red-600 transition border-t border-slate-100 mt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="font-display font-bold text-lg tracking-tight text-slate-900">
              M11 <span className="text-[#FF7A00]">CLUBE</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/funds" data-testid="header-wallet" className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition">
              <Wallet className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-sm font-semibold tabular-nums text-slate-900">{user?.wallet_balance ?? 0}</span>
            </Link>
            <Link to="/notifications" data-testid="header-notifications" className="p-2 hover:bg-slate-100 rounded-lg transition relative">
              <Bell className="w-5 h-5 text-slate-700" />
            </Link>
            <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" data-testid="header-whatsapp" className="p-2 hover:bg-slate-100 rounded-lg transition">
              <Shield className="w-5 h-5 text-green-600" />
            </a>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="px-4 py-4" data-testid="page-content">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto bg-white border-t border-slate-200" data-testid="bottom-nav">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                data-testid={`bottom-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] transition ${active ? "text-[#FF7A00]" : "text-slate-500"}`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${active ? "stroke-[2.5]" : ""}`} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
