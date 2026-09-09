import React, { createContext, useContext, useEffect, useState } from "react";

// Site-wide "am I signed in" state — separate from BookingContext, which
// only lives for the duration of one checkout (sessionStorage, cleared
// after booking). This is backed by localStorage so it survives closing
// the tab/browser, and is readable from anywhere in the app (the header,
// the checkout flow, the account pages).

const STORAGE_KEY = "prkn_auth_state";

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadInitialState);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable — sign-in still works, just won't persist
    }
  }, [user]);

  // { userId, token, contact, method, name }. No password is ever kept
  // here — unlike BookingContext's transient use of one during a single
  // checkout, a long-lived localStorage session should never hold one.
  const login = (nextUser) => setUser(nextUser);
  const updateUser = (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isSignedIn: !!user, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
