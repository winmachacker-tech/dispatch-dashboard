import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import DispatchDashboard from "./DispatchDashboard";
import TrucksPage from "./pages/trucks";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <nav className="flex items-center gap-4 p-4 border-b border-neutral-800">
          <NavLink to="/" className={({ isActive }) => isActive ? "font-semibold" : "opacity-80 hover:opacity-100"}>
            Dashboard
          </NavLink>
          <NavLink to="/trucks" className={({ isActive }) => isActive ? "font-semibold" : "opacity-80 hover:opacity-100"}>
            Trucks
          </NavLink>
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<DispatchDashboard />} />
            <Route path="/trucks" element={<TrucksPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
