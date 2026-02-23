"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, PieChart as PieIcon, 
  ClipboardList, Activity, Loader2, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function UserDashboard() {
  const [mounted, setMounted] = useState(false);
  
  const [laporanList, setLaporanList] = useState([]);
  const [kategoriData, setKategoriData] = useState([]); 
  const [layananData, setLayananData] = useState([]);   

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
        jenis_data ( id, nama, id_kelompok_data, kelompok_data ( id, nama ) )
      `)
      .order('id', { ascending: false });

    if (!error && data) {
      const formatted = data.map(item => {
        const status = item.is_verified ? 'Diproses' : 'Belum Diproses';
        return {
          id: item.id,
          id_jenis: item.jenis_data?.id,
          kategori: item.jenis_data?.kelompok_data?.nama || 'N/A',
          layanan: item.jenis_data?.nama || 'N/A',
          jumlahOrang: Number(item.jumlah || 0),
          status: status
        };
      });
      setLaporanList(formatted);
    }
  }, []);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
      fetchInitialData();
      fetchLaporan();
    });

    const channel = supabase
      .channel('realtime-user-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'isi_data' }, () => { fetchLaporan(); })
      .subscribe();

    return () => {
      cancelAnimationFrame(frameId);
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData, fetchLaporan]);

  const getStatsPerLayanan = useCallback((layananNama, katNama) => {
    const items = laporanList.filter(l => l.layanan === layananNama);
    const total = items.reduce((acc, curr) => acc + curr.jumlahOrang, 0);
    
    const isExcluded = layananNama === 'Aktivasi IKD' || 
                       layananNama === 'Blanko KTP' || 
                       katNama === 'Informasi Umum';
                       
    const proses = isExcluded ? 0 : items.filter(i => i.status === 'Diproses').reduce((acc, curr) => acc + curr.jumlahOrang, 0);
    const belum = isExcluded ? 0 : items.filter(i => i.status === 'Belum Diproses').reduce((acc, curr) => acc + curr.jumlahOrang, 0);
    
    return { total, proses, belum, isExcluded }; 
  }, [laporanList]);

  const dataGrafikKategori = useMemo(() => {
    return kategoriData.map(kat => ({
      name: kat.nama,
      total: laporanList.filter(l => l.kategori === kat.nama).reduce((acc, curr) => acc + curr.jumlahOrang, 0)
    }));
  }, [kategoriData, laporanList]);

  const siPanduData = useMemo(() => {
    const prosesSum = laporanList.filter(i => i.status === 'Diproses').reduce((acc, curr) => acc + curr.jumlahOrang, 0);
    const belumSum = laporanList.filter(i => i.status === 'Belum Diproses').reduce((acc, curr) => acc + curr.jumlahOrang, 0);
    
    return [
      { name: 'Diproses', value: prosesSum, color: '#3b82f6' },
      { name: 'Belum Diproses', value: belumSum, color: '#f59e0b' },
      { name: 'Terbit TTE', value: 0, color: '#10b981' },
    ];
  }, [laporanList]);

  const sortedLayananData = useMemo(() => {
    return [...layananData].sort((a, b) => {
      const katA = kategoriData.find(k => k.id === a.id_kelompok_data)?.nama || 'N/A';
      const katB = kategoriData.find(k => k.id === b.id_kelompok_data)?.nama || 'N/A';
      const orderPriority = { 'Informasi Umum': 1, 'Pencatatan Sipil': 2, 'Pendaftaran Penduduk': 3 };
      return (orderPriority[katA] || 99) - (orderPriority[katB] || 99);
    });
  }, [layananData, kategoriData]);

  const tooltipStyle = { backgroundColor: '#0d1117', border: '1px solid #475569', borderRadius: '10px', color: '#ffffff' };

  if (!mounted) return <div className="min-h-screen bg-[#0d1117]" />;

  return (
    <div className="min-h-screen w-full bg-[#0d1117] text-white font-sans overflow-y-auto">
      <main className="p-6 lg:p-12">
        <div className="max-w-[1440px] mx-auto space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/20 gap-4 shadow-2xl">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase tracking-[0.2em]">Public Monitoring</h1>
              <p className="text-cyan-400 font-bold text-sm tracking-widest uppercase">Layanan Informasi Real-time</p>
            </div>
            <div className="bg-slate-800 border border-slate-500 p-6 rounded-3xl flex items-center gap-8 shadow-2xl">
               <div className="text-right">
                  <p className="text-xs text-cyan-200 font-black uppercase tracking-widest mb-1">Total Seluruh Ajuan</p>
                  <p className="text-4xl font-black text-white leading-none">{laporanList.reduce((a, b) => a + b.jumlahOrang, 0)}</p>
               </div>
               <div className="bg-cyan-500/20 p-4 rounded-2xl text-cyan-400 border border-cyan-500/30">
                  <Activity size={32} />
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#161b22] p-8 rounded-[2.5rem] border border-slate-600 shadow-2xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <BarChart3 size={20} className="text-cyan-400" /> Statistik Kategori Layanan
              </h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGrafikKategori}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <YAxis stroke="#ffffff" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.1)'}} contentStyle={tooltipStyle} itemStyle={{color: '#ffffff'}} />
                    <Bar dataKey="total" fill="#22d3ee" radius={[10, 10, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#161b22] p-8 rounded-[2.5rem] border border-slate-600 shadow-2xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <PieIcon size={20} className="text-pink-400" /> Status Verifikasi
              </h3>
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={siPanduData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {siPanduData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{color: '#ffffff', fontWeight: 'bold'}} />
                    <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '900', color: '#ffffff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-600">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase">
                <ClipboardList size={26} className="text-emerald-400" /> Transparansi Verifikasi Layanan
              </h3>
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
                  {sortedLayananData.map((lay) => {
                    const katNama = kategoriData.find(k => k.id === lay.id_kelompok_data)?.nama || '-';
                    const stats = getStatsPerLayanan(lay.nama, katNama);
                    
                    return (
                      <tr key={lay.id} className="hover:bg-white/[0.05] transition-all group">
                        <td className="p-8"><span className="font-black text-base text-white group-hover:text-cyan-400 uppercase">{lay.nama}</span></td>
                        <td className="p-8 text-sm font-bold text-white uppercase">{katNama}</td>
                        <td className="p-8 text-center">
                          <span className="px-6 py-2.5 rounded-2xl text-lg font-black font-mono bg-cyan-500/30 border border-cyan-400 text-white">
                            {stats.total}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          {!stats.isExcluded && (
                            <div className="flex justify-end gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-white uppercase bg-blue-600 px-3 py-1.5 rounded-lg shadow-lg">
                                <Loader2 size={14} className="text-white" /> <span className="text-white">{stats.proses}</span> Diproses
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-white uppercase bg-amber-600 px-3 py-1.5 rounded-lg shadow-lg">
                                <ShieldAlert size={14} className="text-white" /> <span className="text-white">{stats.belum}</span> Belum Diproses
                              </span>
                            </div>
                          )}
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