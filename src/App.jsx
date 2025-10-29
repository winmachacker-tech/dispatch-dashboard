// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// 🟢 Make sure these names match your actual filenames (case-sensitive).
import DashboardPage from "./pages/dashboard.jsx";
import LoadsPage from "./pages/loads.jsx";
import InTransitPage from "./pages/intransit.jsx";
import DeliveredPage from "./pages/delivered.jsx";
import AvailableLoadsPage from "./pages/availableLoads.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/loads" element={<LoadsPage />} />
          <Route path="/intransit" element={<InTransitPage />} />
          <Route path="/delivered" element={<DeliveredPage />} />
          <Route path="/available" element={<AvailableLoadsPage />} />
          <Route path="*" element={<div className="p-8">Not found.</div>} />
        </Routes>
      </main>
    </div>
  );
}
