import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined=loading, null=anonymous
  const [admin, setAdmin] = useState(undefined);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("m11_token");
    const role = localStorage.getItem("m11_role");
    if (!token) {
      setUser(null);
      setAdmin(null);
      return;
    }
    try {
      if (role === "admin") {
        const { data } = await api.get("/admin/auth/me");
        setAdmin(data);
        setUser(null);
      } else {
        const { data } = await api.get("/auth/me");
        setUser(data);
        setAdmin(null);
      }
    } catch (e) {
      // Only clear session for explicit auth failures (401/403).
      // For network errors / 5xx, KEEP existing user/admin state so the
      // page does not redirect to login on transient blips (esp. right after
      // an admin POST like declaring a result, where browser may briefly
      // throttle subsequent fetches).
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("m11_token");
        localStorage.removeItem("m11_role");
        setUser(null);
        setAdmin(null);
        return;
      }
      // Network/5xx: if state is still undefined (first load) AND token exists,
      // optimistically set a minimal user/admin object so guards don't bounce
      // us to login. Real data will populate on next successful /me call.
      setUser((prev) => (prev === undefined && role !== "admin") ? { _stale: true } : prev);
      setAdmin((prev) => (prev === undefined && role === "admin") ? { _stale: true } : prev);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (mobile, password) => {
    const { data } = await api.post("/auth/login", { mobile, password });
    localStorage.setItem("m11_token", data.token);
    localStorage.setItem("m11_role", "user");
    setUser(data.user);
    setAdmin(null);
    return data.user;
  };

  const register = async (mobile, name, password, referral_code) => {
    const { data } = await api.post("/auth/register", { mobile, name, password, referral_code });
    localStorage.setItem("m11_token", data.token);
    localStorage.setItem("m11_role", "user");
    setUser(data.user);
    return data.user;
  };

  const setSessionFromResetToken = (token, userData) => {
    localStorage.setItem("m11_token", token);
    localStorage.setItem("m11_role", "user");
    setUser(userData);
    setAdmin(null);
  };

  const adminLogin = async (email, password) => {
    const { data } = await api.post("/admin/auth/login", { email, password });
    localStorage.setItem("m11_token", data.token);
    localStorage.setItem("m11_role", "admin");
    setAdmin(data.admin);
    setUser(null);
    return data.admin;
  };

  const logout = () => {
    localStorage.removeItem("m11_token");
    localStorage.removeItem("m11_role");
    setUser(null);
    setAdmin(null);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, admin, login, register, adminLogin, logout, refreshUser, refresh: refreshUser, setSessionFromResetToken, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
