import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";
import { UserGuard, AdminGuard } from "./components/Guards";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AdminLogin from "./pages/AdminLogin";

import Dashboard from "./pages/Dashboard";
import MarketDetail from "./pages/MarketDetail";
import JodiBetPage from "./pages/games/JodiBetPage";
import HarufPage from "./pages/games/HarufPage";
import CrossBetPage from "./pages/games/CrossBetPage";
import MyBids from "./pages/MyBids";
import Passbook from "./pages/Passbook";
import Funds from "./pages/Funds";
import DepositPage from "./pages/DepositPage";
import WithdrawPage from "./pages/WithdrawPage";
import Notifications from "./pages/Notifications";
import MPinPage from "./pages/MPinPage";
import {
  SupportPage, NoticePage, RatesPage, ChartsPage,
  TutorialsPage, IdeaPage, SettingsPage, SharePage
} from "./pages/StaticPages";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMarkets from "./pages/admin/AdminMarkets";
import AdminResults from "./pages/admin/AdminResults";
import AdminJantri from "./pages/admin/AdminJantri";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminBids from "./pages/admin/AdminBids";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUserDetail from "./pages/admin/AdminUserDetail";

function App() {
  return (
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <I18nProvider>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* User app */}
            <Route path="/" element={<UserGuard><Dashboard /></UserGuard>} />
            <Route path="/market/:id" element={<UserGuard><MarketDetail /></UserGuard>} />
            <Route path="/market/:id/game/jodi" element={<UserGuard><JodiBetPage /></UserGuard>} />
            <Route path="/market/:id/game/haruf" element={<UserGuard><HarufPage /></UserGuard>} />
            <Route path="/market/:id/game/cross_bet" element={<UserGuard><CrossBetPage /></UserGuard>} />
            <Route path="/my-bids" element={<UserGuard><MyBids /></UserGuard>} />
            <Route path="/passbook" element={<UserGuard><Passbook /></UserGuard>} />
            <Route path="/funds" element={<UserGuard><Funds /></UserGuard>} />
            <Route path="/deposit" element={<UserGuard><DepositPage /></UserGuard>} />
            <Route path="/withdraw" element={<UserGuard><WithdrawPage /></UserGuard>} />
            <Route path="/notifications" element={<UserGuard><Notifications /></UserGuard>} />
            <Route path="/mpin" element={<UserGuard><MPinPage /></UserGuard>} />
            <Route path="/support" element={<UserGuard><SupportPage /></UserGuard>} />
            <Route path="/notice" element={<UserGuard><NoticePage /></UserGuard>} />
            <Route path="/rates" element={<UserGuard><RatesPage /></UserGuard>} />
            <Route path="/charts" element={<UserGuard><ChartsPage /></UserGuard>} />
            <Route path="/tutorials" element={<UserGuard><TutorialsPage /></UserGuard>} />
            <Route path="/idea" element={<UserGuard><IdeaPage /></UserGuard>} />
            <Route path="/settings" element={<UserGuard><SettingsPage /></UserGuard>} />
            <Route path="/share" element={<UserGuard><SharePage /></UserGuard>} />

            {/* Admin */}
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/markets" element={<AdminGuard><AdminMarkets /></AdminGuard>} />
            <Route path="/admin/results" element={<AdminGuard><AdminResults /></AdminGuard>} />
            <Route path="/admin/jantri" element={<AdminGuard><AdminJantri /></AdminGuard>} />
            <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
            <Route path="/admin/users/:id" element={<AdminGuard><AdminUserDetail /></AdminGuard>} />
            <Route path="/admin/payments" element={<AdminGuard><AdminPayments /></AdminGuard>} />
            <Route path="/admin/bids" element={<AdminGuard><AdminBids /></AdminGuard>} />
            <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
