// src/components/AppProviders.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AppCtx = createContext(null);
export function useApp() {
  return useContext(AppCtx);
}

export default function AppProviders({ children }) {
  const [theme, setTheme] = useState(() => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
