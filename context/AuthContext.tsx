"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { UserBrief, authApi } from "@/lib/api";

interface AuthCtx {
  user: UserBrief | null;
  token: string | null;
  setAuth: (token: string, user: UserBrief, refreshToken?: string) => void;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null, token: null,
  setAuth: () => {}, logout: () => {}, loading: true,
});

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<UserBrief | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("vox_token");
    localStorage.removeItem("vox_refresh");
    localStorage.removeItem("vox_user");
    setToken(null);
    setUser(null);
    window.location.href = "/auth/login";
  }, []);

  const setAuth = useCallback((t: string, u: UserBrief, refreshToken?: string) => {
    localStorage.setItem("vox_token", t);
    localStorage.setItem("vox_user", JSON.stringify(u));
    if (refreshToken) localStorage.setItem("vox_refresh", refreshToken);
    setToken(t);
    setUser(u);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const t  = localStorage.getItem("vox_token");
    const u  = localStorage.getItem("vox_user");
    const rt = localStorage.getItem("vox_refresh");

    if (t && u) {
      const exp = parseJwtExp(t);
      if (exp && exp < Date.now()) {
        // Access token expired — try to refresh
        if (rt) {
          authApi.refresh(rt)
            .then(data => setAuth(data.access_token, data.user, data.refresh_token))
            .catch(logout)
            .finally(() => setLoading(false));
        } else {
          logout();
          setLoading(false);
        }
      } else {
        try { setToken(t); setUser(JSON.parse(u)); } catch { logout(); }
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh 5 minutes before expiry
  useEffect(() => {
    if (!token) return;
    const exp = parseJwtExp(token);
    if (!exp) return;

    const ttl = exp - Date.now() - 5 * 60 * 1000;
    if (ttl <= 0) return;

    const timer = setTimeout(() => {
      const rt = localStorage.getItem("vox_refresh");
      if (!rt) return;
      authApi.refresh(rt)
        .then(data => setAuth(data.access_token, data.user, data.refresh_token))
        .catch(logout);
    }, ttl);

    return () => clearTimeout(timer);
  }, [token, setAuth, logout]);

  return (
    <Ctx.Provider value={{ user, token, setAuth, logout, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
