// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";

import DashboardPage from "./pages/dashboard.jsx";
import LoadsPage from "./pages/loads.jsx";
import AvailableLoadsPage from "./pages/availableLoads.jsx";
import InTransitPage from "./pages/InTransit.jsx";
import DeliveredPage from "./pages/Delivered.jsx";
import DriversPage from "./pages/drivers.jsx";
import ProblemBoard from "./pages/ProblemBoard.jsx";

export default function App() {
  return (
    <Routes>
      {/* Redirect root to /dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        }
      />

      {/* Loads */}
      <Route
        path="/loads"
        element={
          <MainLayout>
            <LoadsPage />
          </MainLayout>
        }
      />

      {/* Available Loads */}
      <Route
        path="/available"
        element={
          <MainLayout>
            <AvailableLoadsPage />
          </MainLayout>
        }
      />

      {/* In Transit */}
      <Route
        path="/intransit"
        element={
          <MainLayout>
            <InTransitPage />
          </MainLayout>
        }
      />

      {/* Delivered */}
      <Route
        path="/delivered"
        element={
          <MainLayout>
            <DeliveredPage />
          </MainLayout>
        }
      />

      {/* Drivers */}
      <Route
        path="/drivers"
        element={
          <MainLayout>
            <DriversPage />
          </MainLayout>
        }
      />

      {/* Problem Board ✅ */}
      <Route
        path="/problem-board"
        element={
          <MainLayout>
            <ProblemBoard />
          </MainLayout>
        }
      />

      {/* Catch-all (404) */}
      <Route
        path="*"
        element={
          <MainLayout>
            <div className="p-8 text-neutral-400">Not found.</div>
          </MainLayout>
        }
      />
    </Routes>
  );
}
