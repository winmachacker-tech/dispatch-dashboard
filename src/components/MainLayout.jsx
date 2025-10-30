import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function MainLayout() {
  return (
    <div className="min-h-screen w-full bg-brand-50 text-brand-900 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 min-w-0">
          <div className="container-app px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
