export default function SectionCard({ title, actions, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 md:p-5 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}
