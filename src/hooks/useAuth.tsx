import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";
import { getToken, getUserId, setAuth, clearAuth } from "../services/authStorage";

type AuthCtx = {
  user: User | null;
  initializing: boolean;
  login: (u: User) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Rehydrate minimal user info from storage on mount if possible
    try {
      const raw = localStorage.getItem("auth_user");
      const token = getToken();
      const id = getUserId();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<User> | null;
        if (parsed && id && token) {
          setUser({
            id,
            email: parsed.email || "",
            role: (parsed.role as User["role"]) || "buyer",
            token,
          });
        }
      }
    } catch {
      // ignore
    }
    setInitializing(false);
  }, []);

  function doLogin(u: User) {
    setUser(u);
    // Store only token and id in dedicated storage, keep other fields in auth_user for UX
    setAuth(u.token, u.id);
    localStorage.setItem("auth_user", JSON.stringify({ id: u.id, email: u.email, role: u.role }));
  }
  function doLogout() {
    setUser(null);
    clearAuth();
    localStorage.removeItem("auth_user");
  }

  return <Ctx.Provider value={{ user, initializing, login: doLogin, logout: doLogout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}