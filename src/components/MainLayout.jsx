// src/components/MainLayout.jsx
import { useState } from "react";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <main className="flex-1 min-w-0">
          {/* Mobile top bar */}
          <div className="md:hidden sticky top-0 z-40 bg-neutral-950/95 backdrop-blur border-b border-neutral-800/70">
            <div className="flex items-center gap-2 px-3 h-12">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-md hover:bg-neutral-800/70"
                aria-label="Open menu"
              >
                <div className="w-5 h-0.5 bg-neutral-200 mb-1" />
                <div className="w-5 h-0.5 bg-neutral-200 mb-1" />
                <div className="w-5 h-0.5 bg-neutral-200" />
              </button>
              <div className="text-sm font-semibold">Dispatch Dashboard</div>
            </div>
          </div>

          {/* Main content area */}
          <div className="p-4 md:p-6 text-neutral-100">
            {children || (
              <div className="text-sm opacity-70">
                (No content rendered for this route)
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
