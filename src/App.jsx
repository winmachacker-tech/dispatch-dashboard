import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout.jsx";

// PAGES (filenames + casing must match exactly)
import DashboardPage from "./pages/dashboard.jsx";
import LoadsPage from "./pages/loads.jsx";
import AvailableLoadsPage from "./pages/availableLoads.jsx";
import InTransitPage from "./pages/InTransit.jsx";
import DeliveredPage from "./pages/Delivered.jsx";
import DriversPage from "./pages/drivers.jsx";
import ProblemBoard from "./pages/ProblemBoard.jsx";
import SettingsPage from "./pages/settings.jsx";
import TrucksPage from "./pages/trucks.jsx";

function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Route not found</h1>
      <p className="text-sm text-brand-700 mt-2">
        The page you’re looking for doesn’t exist.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Redirect legacy root */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Single layout for all app pages */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="loads" element={<LoadsPage />} />
        <Route path="available" element={<AvailableLoadsPage />} />
        <Route path="in-transit" element={<InTransitPage />} />
        <Route path="delivered" element={<DeliveredPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="problems" element={<ProblemBoard />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="trucks" element={<TrucksPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Absolute catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
