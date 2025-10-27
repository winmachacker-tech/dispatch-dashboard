// src/components/ThemeToggle.jsx
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { applyTheme, getStoredTheme, setTheme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setLocalTheme] = useState("system");

  useEffect(() => {
    setLocalTheme(getStoredTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function choose(nextTheme) {
    setLocalTheme(nextTheme);
    setTheme(nextTheme);
  }

  const Btn = ({ value, icon, label }) => (
    <button
      onClick={() => choose(value)}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition
        ${
          theme === value
            ? "border-neutral-500/50 bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700"
            : "border-neutral-300/50 hover:border-neutral-500/60 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        }`}
      aria-pressed={theme === value}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <Btn value="light" icon={<Sun size={16} />} label="Light" />
      <Btn value="dark" icon={<Moon size={16} />} label="Dark" />
      <Btn value="system" icon={<Monitor size={16} />} label="System" />
    </div>
  );
}
