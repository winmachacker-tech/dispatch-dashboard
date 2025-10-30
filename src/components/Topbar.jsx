// src/components/Topbar.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import AddLoadModal from "./AddLoadModal"; // change to ../AddLoadModal if Topbar is in a subfolder

export default function Topbar() {
  const loc = useLocation();
  const [showAdd, setShowAdd] = useState(false);

  // Match any of these pages (and their nested routes)
  const showOnPages = useMemo(
    () => ["/loads", "/in-transit", "/delivered", "/problem"],
    []
  );

  // True if current path contains any of our target segments
  const canAddLoad = useMemo(() => {
    const p = loc.pathname.toLowerCase();
    return showOnPages.some((seg) => p.includes(seg.replace("/", "")));
  }, [loc.pathname, showOnPages]);

  // Keyboard shortcut: "N" opens Add Load when allowed
  useEffect(() => {
    function onKey(e) {
      if (!canAddLoad) return;
      // Ignore if typing in an input/textarea/contenteditable
      const tag = (e.target?.tagName || "").toLowerCase();
      const editable =
        tag === "input" ||
        tag === "textarea" ||
        (e.target?.isContentEditable ?? false);
      if (editable) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowAdd(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canAddLoad]);

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800">
      {/* Left side: keep your breadcrumbs / titles / search input here */}
      <div className="flex-1 min-w-0">
        {/* Example breadcrumb container (optional): */}
        {/* <div className="text-sm text-gray-500 truncate">Overwatch | Ops • Enterprise TMS</div> */}
      </div>

      {/* Right side: actions */}
      <div className="flex items-center gap-2">
        {/* Place your existing bell/profile/etc. buttons here */}

        {canAddLoad && (
          <>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-3 py-2 hover:bg-black/90"
              title="Add a new load (N)"
              data-testid="add-load-btn"
            >
              <Plus className="h-4 w-4" />
              Add Load
            </button>

            {/* Modal lives here so it can mount on any supported page */}
            <AddLoadModal
              open={showAdd}
              onClose={() => setShowAdd(false)}
              // After creation, refresh the page data; lightweight + reliable
              onCreated={() => window.location.reload()}
            />
          </>
        )}
      </div>
    </div>
  );
}
