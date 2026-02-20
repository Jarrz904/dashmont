"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, Clock, BarChart3, PieChart as PieIcon, 
  ClipboardList, Activity, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function UserDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  
  const [laporanList, setLaporanList] = useState([]);
  const [kategoriData, setKategoriData] = useState([]); 
  const [layananData, setLayananData] = useState([]);  

  // --- FUNGSI FETCH (READ ONLY) ---
  const fetchInitialData = useCallback(async () => {
    const { data: kat } = await supabase.from('kelompok_data').select('*');
    if (kat) setKategoriData(kat);

    const { data: lay } = await supabase.from('jenis_data').select('*');
    if (lay) setLayananData(lay);
  }, []);

  const fetchLaporan = useCallback(async () => {
    const { data, error } = await supabase
      .from('isi_data')
      .select(`
        id, jumlah, tanggal, jam, is_verified,
        jenis_data ( id, nama, kelompok_data ( id, nama ) )
      `)
      .order('id', { ascending: false });

    if (!error && data) {
      const formatted = data.map(item => ({
        id: item.id,
        id_jenis: item.jenis_data?.id,
        kategori: item.jenis_data?.kelompok_data?.nama || 'N/A',
        layanan: item.jenis_data?.nama || 'N/A',
        jumlahOrang: item.jumlah,
        tanggalFull: item.tanggal,
        jam: item.jam,
        isVerified: item.is_verified 
      }));
      setLaporanList(formatted);
    }
  }, []);

  useEffect(() => {
    // Menghilangkan peringatan cascading render dengan requestAnimationFrame
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
      fetchInitialData();
      fetchLaporan();
    });
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const channel = supabase
      .channel('realtime-user-dashboard')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'isi_data' }, 
        () => {
          fetchLaporan();
        }
      )
      .subscribe();

    return () => {
      cancelAnimationFrame(frameId);
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData, fetchLaporan]);

  // --- LOGIKA PERHITUNGAN DATA ---
  const getStatsPerLayanan = useCallback((layananNama) => {
    const items = laporanList.filter(l => l.layanan === layananNama);
    const total = items.reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
    const verified = items.filter(i => i.isVerified).reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
    const unverified = items.filter(i => !i.isVerified).reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
    return { total, verified, unverified };
  }, [laporanList]);

  const getTotalPerGrup = useCallback((grupName) => {
    return laporanList
      .filter(l => l.kategori === grupName)
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
  }, [laporanList]);

  const dataGrafikKategori = useMemo(() => {
    return kategoriData.map(kat => ({
      name: kat.nama,
      total: getTotalPerGrup(kat.nama)
    }));
  }, [kategoriData, getTotalPerGrup]);

  const siPanduData = useMemo(() => [
    { name: 'Selesai', value: 45, color: '#10b981' },
    { name: 'Proses', value: 3, color: '#3b82f6' },
    { name: 'Antrian', value: 30, color: '#f59e0b' },
  ], []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0d1117]" />;
  }

  return (
    <div className="min-h-screen w-full bg-[#0d1117] text-white font-sans overflow-y-auto">
      <main className="p-6 lg:p-12">
        <div className="max-w-[1440px] mx-auto space-y-8">
          
          {/* HEADER DASHBOARD */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/20 gap-4 shadow-2xl">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase tracking-[0.2em]">Public Monitoring</h1>
              <p className="text-cyan-400 font-bold text-sm tracking-widest uppercase">Layanan Informasi Real-time</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-white border border-slate-500">
                  <Calendar size={16} className="text-cyan-400" /> {currentTime.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </span>
                <span className="flex items-center gap-2 bg-emerald-500/30 px-4 py-2 rounded-xl text-xs font-mono text-emerald-300 border border-emerald-500/50">
                  <Clock size={16} /> {currentTime.toLocaleTimeString('id-ID')}
                </span>
              </div>
            </div>
            
            <div className="bg-slate-800 border border-slate-500 p-6 rounded-3xl flex items-center gap-8 shadow-2xl">
               <div className="text-right">
                  <p className="text-xs text-cyan-200 font-black uppercase tracking-widest mb-1">Total Seluruh Ajuan</p>
                  <p className="text-4xl font-black text-cyan-400 leading-none">
                    {laporanList.reduce((a, b) => a + Number(b.jumlahOrang), 0)}
                  </p>
               </div>
               <div className="bg-cyan-500/20 p-4 rounded-2xl text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-500/30">
                  <Activity size={32} />
               </div>
            </div>
          </header>

          {/* GRID GRAFIK */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#161b22] p-8 rounded-[2.5rem] border border-slate-600 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 size={20} className="text-cyan-400" /> Statistik Kategori Layanan
                </h3>
                <div className="flex gap-2 items-center">
                  <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                  <span className="text-xs font-bold text-white">Satuan: </span>
                </div>
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGrafikKategori}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                    <XAxis dataKey="name" stroke="#f1f5f9" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#f1f5f9" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.1)'}}
                      contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #22d3ee', borderRadius: '15px', color: '#fff' }}
                    />
                    <Bar dataKey="total" fill="#22d3ee" radius={[10, 10, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#161b22] p-8 rounded-[2.5rem] border border-slate-600 shadow-2xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <PieIcon size={20} className="text-pink-400" /> Status Aplikasi (Si Pandu)
              </h3>
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={siPanduData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {siPanduData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', color: '#fff'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-30px]">
                  <span className="text-3xl font-black text-white">Live</span>
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest animate-pulse">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABEL REKAP VERIFIKASI */}
          <div className="bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-600">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase">
                <ClipboardList size={26} className="text-emerald-400" /> Transparansi Verifikasi Layanan
              </h3>
              <p className="text-sm text-cyan-300 font-bold mt-1 uppercase tracking-wider">Laporan akumulasi data per jenis layanan publik</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0d1117] text-white text-xs font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-8 border-b border-slate-600">Jenis Layanan</th>
                    <th className="p-8 border-b border-slate-600">Kelompok Data</th>
                    <th className="p-8 border-b border-slate-600 text-center">Total Ajuan</th>
                    <th className="p-8 border-b border-slate-600 text-right">Rincian Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  {layananData.map((lay) => {
                    const stats = getStatsPerLayanan(lay.nama);
                    return (
                      <tr key={lay.id} className="hover:bg-white/[0.05] transition-all group">
                        <td className="p-8">
                          <span className="font-black text-base text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{lay.nama}</span>
                        </td>
                        <td className="p-8 text-xs font-bold text-white uppercase tracking-widest">
                          {kategoriData.find(k => k.id === lay.id_kelompok_data)?.nama || '-'}
                        </td>
                        <td className="p-8 text-center">
                          <span className={`px-6 py-2.5 rounded-2xl text-lg font-black font-mono border ${stats.total > 0 ? 'bg-cyan-500/30 text-white border-cyan-400' : 'bg-slate-800 text-white/60 border-slate-700'}`}>
                            {stats.total}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex justify-end gap-3">
                            {/* Label "Sudah" dengan teks putih terang */}
                            <span className="inline-flex items-center gap-2 text-xs font-black text-white uppercase bg-emerald-600 px-4 py-2 rounded-xl border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                              <CheckCircle2 size={14} className="text-white" /> {stats.verified} Sudah
                            </span>
                            {/* Label "Belum" dengan teks putih terang */}
                            <span className="inline-flex items-center gap-2 text-xs font-black text-white uppercase bg-amber-600 px-4 py-2 rounded-xl border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                              <ShieldAlert size={14} className="text-white" /> {stats.unverified} Belum
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}