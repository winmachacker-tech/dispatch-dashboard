// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/Sidebar";

import DashboardPage from "./pages/dashboard";
import LoadsPage from "./pages/loads";
import TrucksPage from "./pages/trucks";
// If you have this page, keep it. Otherwise remove this import/route.
// import AvailableLoadsPage from "./pages/availableLoads";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      {/* Layout wrapper: stacks on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row">
        {/* SIDEBAR: full width on mobile, fixed width on desktop */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md">
          <Sidebar />
        </div>

        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0">
          {/* HEADER: tighter on mobile, same look on desktop */}
          <header className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md">
            <h1 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
              <Link to="/">Dispatch Dashboard</Link>
            </h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          {/* PAGE CONTENT: smaller padding on phones */}
          <main className="p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/loads" element={<LoadsPage />} />
              <Route path="/trucks" element={<TrucksPage />} />
              {/* <Route path="/available" element={<AvailableLoadsPage />} /> */}
              {/* Fallback: simple not found */}
              <Route path="*" element={<div className="text-sm opacity-70">Page not found</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
