// src/components/Layout.jsx
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Topbar />
          <main className="p-4 md:p-6 max-w-[1400px] mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
