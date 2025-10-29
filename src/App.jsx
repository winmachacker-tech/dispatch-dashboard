// src/App.jsx
import { Routes, Route, NavLink } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import DashboardPage from "./pages/dashboard.jsx";
import LoadsPage from "./pages/loads.jsx";
import InTransitPage from "./pages/intransit.jsx";
import DeliveredPage from "./pages/delivered.jsx";
import AvailableLoadsPage from "./pages/availableLoads.jsx";
import DriversPage from "./pages/drivers.jsx";
import TrucksPage from "./pages/trucks.jsx";


export default function App() {
return (
<div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
<div className="flex">
<Sidebar />
<main className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
<Routes>
<Route path="/" element={<DashboardPage />} />
<Route path="/loads" element={<LoadsPage />} />
<Route path="/intransit" element={<InTransitPage />} />
<Route path="/delivered" element={<DeliveredPage />} />
<Route path="/available" element={<AvailableLoadsPage />} />
<Route path="/drivers" element={<DriversPage />} />
<Route path="/trucks" element={<TrucksPage />} />
</Routes>
</main>
</div>
</div>
);
}