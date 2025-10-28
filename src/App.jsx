import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Menu } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/Sidebar";

import DashboardPage from "./pages/dashboard";
import LoadsPage from "./pages/loads";
import TrucksPage from "./pages/trucks";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Top bar (always visible) */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
        {/* Mobile menu button */}
        <button
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-800"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open Menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-lg sm:text-xl font-semibold">
          <Link to="/">Dispatch Dashboard</Link>
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {/* Leave your existing quick-action buttons here */}
          <ThemeToggle />
        </div>
      </header>

      <div className="relative flex">
        {/* Sidebar: static on desktop, drawer on mobile */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Page content */}
        <main
          className="
            flex-1 min-w-0
            px-4 sm:px-6 py-5
            lg:ml-0
          "
        >
          {/* Constrain very wide screens slightly for nicer reading on mobile */}
          <div className="mx-auto max-w-[1200px]">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/loads" element={<LoadsPage />} />
              <Route path="/trucks" element={<TrucksPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
