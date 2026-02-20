import { LayoutDashboard, FileEdit, LogOut } from 'lucide-react';

export default function Sidebar({ setCurrentPage, currentPage }) {
  const menu = [
    { name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Input Data', icon: <FileEdit size={18} /> },
  ];

  return (
    <aside className="w-20 lg:w-64 bg-[#0d1117] border-r border-slate-800/60 flex flex-col z-20 relative">
      {/* GLOW DECORATION */}
      <div className="absolute top-0 left-0 w-full h-32 bg-cyan-500/5 blur-[50px] -z-10 pointer-events-none"></div>

      {/* LOGO SECTION */}
      <div className="px-4 py-8 flex flex-col items-center border-b border-slate-800/40">
        <div className="relative group mb-4">
          {/* Glow Effect */}
          <div className="absolute -inset-3 bg-cyan-500/10 rounded-full blur-xl group-hover:opacity-100 transition duration-1000"></div>
          
          {/* Wadah Logo - Ukuran Besar */}
          <div className="relative w-28 h-28 lg:w-32 lg:h-32 flex items-center justify-center transform transition-all duration-500 group-hover:scale-105">
            <img 
              src="/logo.png" 
              alt="Logo Dinas"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            />
          </div>
        </div>

        {/* Teks Header - Nama Lengkap Dinas */}
        <div className="hidden lg:block text-center px-2">
          <h2 className="text-white font-black text-[10px] uppercase tracking-wider leading-relaxed">
            Dinas Kependudukan <br /> 
            <span className="text-cyan-400">dan</span> Pencatatan Sipil
          </h2>
          <div className="h-[1px] w-8 bg-slate-700 mx-auto my-2"></div>
          <p className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase">
            Kabupaten Tegal
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1 px-3 mt-6">
        <p className="hidden lg:block text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 ml-3">
          Main Menu
        </p>
        
        {menu.map((item) => (
          <button
            key={item.name}
            onClick={() => setCurrentPage(item.name)}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
              currentPage === item.name 
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10' 
              : 'text-slate-500 hover:bg-slate-800/30 hover:text-slate-200'
            }`}
          >
            <div className={`transition-transform duration-300 ${currentPage === item.name ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            <span className={`hidden lg:block font-bold text-[11px] uppercase tracking-wider ${
              currentPage === item.name ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
            }`}>
              {item.name}
            </span>
            
            {currentPage === item.name && (
              <div className="hidden lg:block ml-auto w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            )}
          </button>
        ))}
      </nav>

      {/* FOOTER SIDEBAR */}
      <div className="mt-auto border-t border-slate-800/60 p-3">
        <button className="w-full flex items-center justify-center lg:justify-start gap-3 py-2 px-4 text-slate-600 hover:text-red-400 transition-colors group rounded-xl hover:bg-red-500/5">
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden lg:block font-black text-[9px] uppercase tracking-[0.2em]">Logout</span>
        </button>
      </div>
    </aside>
  );
}