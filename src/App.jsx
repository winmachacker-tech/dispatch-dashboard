// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/Sidebar";

// Page imports
import DashboardPage from "./pages/dashboard";   // ✅ lowercase file
import LoadsPage from "./pages/loads";
import TrucksPage from "./pages/trucks";
import InTransitPage from "./pages/InTransit";   // ✅ matches filename
import DeliveredPage from "./pages/Delivered";   // ✅ matches filename
import AvailableLoadsPage from "./pages/availableLoads"; // ✅ matches filename

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md">
            <h1 className="text-xl font-semibold">
              <Link to="/">Dispatch Dashboard</Link>
            </h1>
            <ThemeToggle />
          </header>

          {/* Routes */}
          <main className="p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/loads" element={<LoadsPage />} />
              <Route path="/trucks" element={<TrucksPage />} />
              <Route path="/in-transit" element={<InTransitPage />} />
              <Route path="/delivered" element={<DeliveredPage />} />
              <Route path="/available-loads" element={<AvailableLoadsPage />} />
              <Route path="*" element={<div>Page not found</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
