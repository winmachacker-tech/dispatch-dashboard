import { Bell, Search, User } from "lucide-react";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-brand-200">
      <div className="container-app px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-brand-700">
          <div className="font-semibold">USKO | Ops</div>
          <div className="text-brand-400">•</div>
          <div className="text-sm">Enterprise TMS</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <input
              className="h-9 w-64 rounded-lg border border-brand-200 px-3 text-sm outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Quick search (loads, drivers, trucks)…"
            />
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-brand-400" />
          </div>
          <button className="h-9 w-9 rounded-full bg-brand-100 hover:bg-brand-200 flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </button>
          <div className="h-9 px-3 rounded-full bg-brand-900 text-white flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm">Mark T.</span>
          </div>
        </div>
      </div>
    </header>
  );
}
