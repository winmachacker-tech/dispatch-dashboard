// src/components/ThemeToggle.jsx
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    typeof window !== "undefined" &&
      (localStorage.theme === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches))
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      root.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="h-9 w-9 rounded-full bg-[hsl(var(--secondary))] hover:opacity-90 flex items-center justify-center"
      title={dark ? "Switch to light" : "Switch to dark"}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
