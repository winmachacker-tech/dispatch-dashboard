// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import Sidebar from "./components/Sidebar";

// src/App.jsx
import DashboardPage from "./pages/dashboard.jsx";
import LoadsPage from "./pages/loads.jsx";
import TrucksPage from "./pages/trucks.jsx";
import DriversPage from "./pages/drivers.jsx";
import InTransitPage from "./pages/InTransit.jsx";   // ✅ match file casing
import DeliveredPage from "./pages/Delivered.jsx";   // ✅ match file casing
import AvailableLoadsPage from "./pages/availableLoads.jsx"; // ✅ match file name exactly



export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md">
            <h1 className="text-xl font-semibold"><Link to="/">Dispatch Dashboard</Link></h1>
            <ThemeToggle />
          </header>

          <main className="p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/loads" element={<LoadsPage />} />
              <Route path="/trucks" element={<TrucksPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/in-transit" element={<InTransitPage />} />  {/* 👈 this is the missing one */}
              <Route path="/delivered" element={<DeliveredPage />} />
              <Route path="/available" element={<AvailableLoadsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
