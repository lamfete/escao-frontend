import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";

type AuthCtx = {
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("auth_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  function doLogin(u: User) {
    setUser(u);
    localStorage.setItem("auth_user", JSON.stringify(u));
  }
  function doLogout() {
    setUser(null);
    localStorage.removeItem("auth_user");
  }

  return <Ctx.Provider value={{ user, login: doLogin, logout: doLogout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}