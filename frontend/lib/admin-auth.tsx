"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  adminLogin as apiLogin,
  adminLogout as apiLogout,
  getAdminMe,
  type AdminUser,
} from "./admin-api";

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({} as AdminUser),
  logout: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function restoreSession() {
      const savedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("gr_admin_token")
          : null;
      const savedUser =
        typeof window !== "undefined"
          ? localStorage.getItem("gr_admin_user")
          : null;

      if (!savedToken || !savedUser) {
        queueMicrotask(() => setIsLoading(false));
        return;
      }

      try {
        JSON.parse(savedUser);
        const res = await getAdminMe();
        setToken(savedToken);
        setUser(res.user);
        localStorage.setItem("gr_admin_user", JSON.stringify(res.user));
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem("gr_admin_token");
        localStorage.removeItem("gr_admin_user");
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email: string, pass: string): Promise<AdminUser> => {
    const res = await apiLogin(email, pass);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("gr_admin_token", res.token);
    localStorage.setItem("gr_admin_user", JSON.stringify(res.user));
    return res.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("gr_admin_token");
      localStorage.removeItem("gr_admin_user");
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
