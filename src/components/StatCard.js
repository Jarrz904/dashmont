export default function StatCard({ title, children }) {
  return (
    <div className="bg-[#161b22] p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col h-full">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 border-b border-slate-800/50 pb-2">
        {title}
      </h3>
      <div className="flex-1">{children}</div>
    </div>
  );
}