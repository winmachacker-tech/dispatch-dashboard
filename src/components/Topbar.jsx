// src/components/Topbar.jsx
import { Menu } from "lucide-react";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-10 bg-white border-b">
      <div className="h-14 flex items-center gap-3 px-3 md:px-6">
        <button className="md:hidden p-2 rounded hover:bg-gray-100" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="text-sm text-gray-500">v0.2 • Supabase-backed</div>
        <div className="ml-auto text-sm text-gray-400">USA / PT</div>
      </div>
    </header>
  );
}
