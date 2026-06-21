import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function UserGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) return <LoadingShell />;
  if (!user) return <Navigate to="/register" replace state={{ from: location }} />;
  return children;
}

export function AdminGuard({ children }) {
  const { admin } = useAuth();
  const location = useLocation();
  if (admin === undefined) return <LoadingShell />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  return children;
}

function LoadingShell() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-2xl font-display font-bold text-slate-900 tracking-tight">M11 CLUBE</div>
        <div className="text-xs uppercase tracking-widest text-slate-400 mt-2">Loading…</div>
      </div>
    </div>
  );
}
