// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import DashboardPage from "./pages/dashboard.jsx";
import LoadsPage from "./pages/loads.jsx";
import InTransitPage from "./pages/InTransit.jsx";     // << correct case
import DeliveredPage from "./pages/Delivered.jsx";     // << correct case
import AvailableLoadsPage from "./pages/availableLoads.jsx"; // << your file name
import DriversPage from "./pages/drivers.jsx";
import TrucksPage from "./pages/trucks.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/loads" element={<LoadsPage />} />
              <Route path="/in-transit" element={<InTransitPage />} />
              <Route path="/delivered" element={<DeliveredPage />} />
              <Route path="/available" element={<AvailableLoadsPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/trucks" element={<TrucksPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </main>
      </div>
    </div>
  );
}
