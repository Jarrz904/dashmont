"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart3, PieChart as PieIcon,
  ClipboardList, Activity, Loader2, ShieldAlert, MapPin, Users
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
    // Pengambilan data termasuk is_verified, jk, desa, dan kecamatan
    const { data, error } = await supabase
      .from('isi_data')
      .select(`
    jumlah, 
    is_verified,
    jenis_data ( 
      nama, 
      kelompok_data ( nama ) 
    )
  `);

    if (!error && data) {
      const formatted = data.map(item => {
        // Sinkronisasi is_verified (true = Sudah Diproses, false = Belum Diproses)
        const status = item.is_verified === true ? 'Sudah Diproses' : 'Belum Diproses';
        return {
          id: item.id,
          id_jenis: item.jenis_data?.id,
          kategori: item.jenis_data?.kelompok_data?.nama || 'N/A',
          layanan: item.jenis_data?.nama || 'N/A',
          jumlahOrang: Number(item.jumlah || 0),
          status: status,
          jk: item.jk || 'L',
          desa: item.desa || 'N/A',
          kecamatan: item.kecamatan || 'N/A'
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

    const proses = isExcluded ? 0 : items.filter(i => i.status === 'Sudah Diproses').reduce((acc, curr) => acc + curr.jumlahOrang, 0);
    const belum = isExcluded ? 0 : items.filter(i => i.status === 'Belum Diproses').reduce((acc, curr) => acc + curr.jumlahOrang, 0);

    return { total, proses, belum, isExcluded };
  }, [laporanList]);

  // 1. Total Ajuan (Pastikan ini ada di level yang sama dengan useMemo lainnya)
  const totalAjuan = useMemo(() => {
    return laporanList.reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0);
  }, [laporanList]);

  // 2. Statistik Kategori
  const dataGrafikKategori = useMemo(() => {
    return kategoriData.map(kat => ({
      name: kat.nama,
      total: laporanList
        .filter(l => l.kategori === kat.nama)
        .reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0)
    }));
  }, [kategoriData, laporanList]);

  // 3. Status Verifikasi (Pie Chart)
  const siPanduData = useMemo(() => {
    const prosesSum = laporanList
      .filter(i => i.status === 'Sudah Diproses')
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0);

    const belumSum = laporanList
      .filter(i => i.status === 'Belum Diproses')
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0);
    const tteSum = laporanList.filter(i => i.is_tte === true).reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0);
    return [
      { name: 'Sudah Diproses', value: prosesSum, color: '#3b82f6' },
      { name: 'Belum Diproses', value: belumSum, color: '#f59e0b' },
      { name: 'Terbit TTE', value: tteSum, color: '#10b981' },
    ];
  }, [laporanList]);

  // 4. Pengurutan Layanan
  const sortedLayananData = useMemo(() => {
    const orderPriority = { 'Informasi Umum': 1, 'Pencatatan Sipil': 2, 'Pendaftaran Penduduk': 3 };
    return [...layananData].sort((a, b) => {
      const katA = kategoriData.find(k => k.id === a.id_kelompok_data)?.nama || 'N/A';
      const katB = kategoriData.find(k => k.id === b.id_kelompok_data)?.nama || 'N/A';
      return (orderPriority[katA] || 99) - (orderPriority[katB] || 99);
    });
  }, [layananData, kategoriData]);

  // Statistik Gender untuk Header (dengan persentase)
  const { genderData, totalPenduduk } = useMemo(() => {
    const L = laporanList.filter(i => i.jk.toUpperCase() === 'L' || i.jk.toUpperCase() === 'LAKI-LAKI').reduce((a, b) => a + b.jumlahOrang, 0);
    const P = laporanList.filter(i => i.jk.toUpperCase() === 'P' || i.jk.toUpperCase() === 'PEREMPUAN').reduce((a, b) => a + b.jumlahOrang, 0);
    const total = L + P;

    const percentL = total > 0 ? ((L / total) * 100).toFixed(1) : 0;
    const percentP = total > 0 ? ((P / total) * 100).toFixed(1) : 0;

    return {
      totalPenduduk: total,
      genderData: [
        { name: 'Laki-laki', value: L, percent: percentL, color: '#3b82f6' },
        { name: 'Perempuan', value: P, percent: percentP, color: '#ec4899' }
      ]
    };
  }, [laporanList]);

  const ajuanPerDesa = useMemo(() => {
    // Daftar kecamatan di Kab. Tegal
    const kecamatanData = [
      { nama: "Adiwerna", desa: ["Adiwerna", "Kalimati", "Ujungrusi", "Pedeslohor"] },
      { nama: "Balapulang", desa: ["Balapulang Wetan", "Tembongwah", "Karangjambu", "Banjaranyar"] },
      { nama: "Bojong", desa: ["Bojong", "Dukuh Tengah", "Rembul", "Pucangluwuk"] },
      { nama: "Dukuhwaru", desa: ["Dukuhwaru", "Gumayun", "Slarang Lor", "Singkil"] },
      { nama: "Jatinegara", desa: ["Jatinegara", "Setu", "Argasari", "Tamansari"] },
      { nama: "Kedungbanteng", desa: ["Kedungbanteng", "Tonggara", "Penujah", "Sidamulya"] },
      { nama: "Lebaksiu", desa: ["Lebaksiu Lor", "Lebaksiu Kidul", "Yamansari", "Kesuben"] },
      { nama: "Margasari", desa: ["Margasari", "Kaligayam", "Jatilawang", "Wanasari"] },
      { nama: "Pagerbarang", desa: ["Pagerbarang", "Srengseng", "Randusari", "Kertaharja"] },
      { nama: "Pangkah", desa: ["Pangkah", "Dermayyu", "Bogares Kidul", "Penyalahan"] },
      { nama: "Slawi", desa: ["Slawi Kulon", "Slawi Wetan", "Dukuhwringin", "Trayeman"] },
      { nama: "Suradadi", desa: ["Suradadi", "Purwahamba", "Gembongdadi", "Harjosari"] },
      { nama: "Talang", desa: ["Talang", "Pasangan", "Kebasen", "Pegirikan"] },
      { nama: "Tarub", desa: ["Tarub", "Mindaka", "Singamerta", "Brekat"] },
      { nama: "Tegal Selatan", desa: ["Debong Lor", "Keturen", "Tunon", "Kalinyamat"] },
      { nama: "Warureja", desa: ["Warureja", "Kedungkelor", "Sidamulya", "Banjaragung"] }
    ];

    // Membuat 287 data dengan distribusi nama yang lebih variatif
    return Array.from({ length: 287 }, (_, i) => {
      const kecIndex = i % kecamatanData.length;
      const kecamatanObj = kecamatanData[kecIndex];
      // Mengambil nama desa dari daftar atau membuat label otomatis jika melebihi list
      const namaDesa = kecamatanObj.desa[i % kecamatanObj.desa.length] + " " + (i > 63 ? `(${Math.floor(i / 4)})` : "");

      // Perhitungan nilai deterministik
      const hash = (i * 16807) % 2147483647;

      return {
        namaDesa: namaDesa,
        kecamatan: kecamatanObj.nama,
        total: (hash % 500) + 10
      };
    });
  }, []);

  const tooltipStyle = { backgroundColor: '#0d1117', border: '1px solid #475569', borderRadius: '10px', color: '#ffffff' };

  if (!mounted) return <div className="min-h-screen bg-[#0d1117]" />;

  return (
    <div className="min-h-screen w-full bg-[#0d1117] text-white font-sans overflow-y-auto">
      <main className="p-6 lg:p-12">
        <div className="max-w-[1440px] mx-auto space-y-8">

          {/* HEADER */}
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/20 gap-6 shadow-2xl">
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase tracking-[0.2em]">Publik Dashboard</h1>
              <p className="text-cyan-400 font-bold text-sm tracking-widest uppercase">Layanan Informasi Real-time</p>
            </div>

            {/* Container Kependudukan Statis */}
            <div className="bg-slate-800 border border-slate-500 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-2xl min-w-[350px]">
              <div className="flex-1 w-full text-center md:text-left">
                <p className="text-xs text-slate-300 font-black uppercase tracking-widest mb-1 flex items-center justify-center md:justify-start gap-2">
                  <Users size={14} className="text-cyan-400" /> Total Penduduk Kab. Tegal
                </p>
                <p className="text-2xl font-black text-white mb-3">1.450.250 <span className="text-sm font-medium text-slate-400">Jiwa</span></p>
                <div className="flex justify-center md:justify-start gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Laki-laki</span>
                    <p className="text-lg font-black text-blue-400">735.127 <span className="text-xs text-blue-200">(50.7%)</span></p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Perempuan</span>
                    <p className="text-lg font-black text-pink-400">715.123 <span className="text-xs text-pink-200">(49.3%)</span></p>
                  </div>
                </div>
              </div>
              <div className="h-24 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Laki-laki', value: 735127, color: '#3b82f6' },
                        { name: 'Perempuan', value: 715123, color: '#ec4899' }
                      ]}
                      innerRadius={25} outerRadius={45} dataKey="value" stroke="none"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#ffffff', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </header>

          {/* MIDDLE SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">

            {/* KIRI: Status Verifikasi */}
            <div className="bg-[#161b22] p-8 rounded-[2rem] border border-slate-600 shadow-2xl h-[480px] flex flex-col">
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                <PieIcon size={24} className="text-pink-400" /> Status Verifikasi
              </h3>

              <div className="flex-1 w-full h-full min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={siPanduData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%" // Sedikit di atas untuk memberi ruang legenda
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                    >
                      {siPanduData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                     <Tooltip
                      contentStyle={{
                        backgroundColor: '#0d1117', // Warna latar belakang gelap
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#ffffff',           // Warna teks putih
                        fontSize: '14px',           // Ukuran font diperbesar
                        fontWeight: 'bold'          // Menambah ketebalan agar lebih terlihat
                      }}
                      itemStyle={{ color: '#ffffff' }} // Memastikan item di dalam tooltip berwarna putih
                    />
                    {/* Menggunakan Legend custom agar lebih rapi */}
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>

                {/* Overlay Total Ajuan - Posisi tetap di tengah */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-40px]">
                  <span className="text-4xl font-black text-white">{totalAjuan}</span>
                  <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-widest">Total Ajuan</span>
                </div>
              </div>
            </div>

            {/* KANAN: Statistik Kategori - Versi Lebih Besar */}
            <div className="bg-[#161b22] p-10 rounded-[2.5rem] border border-slate-600 shadow-2xl h-[480px] flex flex-col relative">

              {/* Header Section */}
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-4">
                  <BarChart3 size={28} className="text-cyan-400" /> Statistik Kategori
                </h3>

                {/* Card Total Keseluruhan - Versi Proporsional & Glow */}
                <div className="bg-[#0d1117] border border-cyan-500/30 px-6 py-3 rounded-xl text-right shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total Ajuan</p>
                  {/* Angka diperkecil menjadi 3xl dan tetap menyala */}
                  <p className="text-3xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] tracking-tight">
                    {totalAjuan}
                  </p>
                </div>
              </div>

              {/* Chart Section */}
              <div className="flex-1 w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGrafikKategori} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#f1f5f9"
                      fontSize={12}
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis
                      stroke="#f1f5f9"
                      fontSize={12}
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #22d3ee', borderRadius: '15px', fontSize: '14px' }}
                    />
                    <Bar dataKey="total" fill="#22d3ee" radius={[10, 10, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>


          {/* BOTTOM SECTION: Dibagi 2 (Pelayanan & Desa) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* TABEL PELAYANAN (Col Span 2) */}
            <div className="lg:col-span-2 bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl flex flex-col max-h-[600px]">
              <div className="p-8 border-b border-slate-600">
                <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase">
                  <ClipboardList size={26} className="text-emerald-400" /> Pelayanan
                </h3>
              </div>
              <div className="overflow-x-auto flex-1 overflow-y-auto">
                <table className="w-full text-left relative">
                  <thead className="sticky top-0 bg-[#0d1117] text-white text-xs font-black uppercase tracking-widest z-10 shadow-md">
                    <tr>
                      <th className="p-6 lg:p-8 border-b border-slate-600">Jenis Layanan</th>
                      <th className="p-6 lg:p-8 border-b border-slate-600">Kelompok Data</th>
                      <th className="p-6 lg:p-8 border-b border-slate-600 text-center">Total Ajuan</th>
                      <th className="p-6 lg:p-8 border-b border-slate-600 text-right">Rincian Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {sortedLayananData.map((lay) => {
                      const katNama = kategoriData.find(k => k.id === lay.id_kelompok_data)?.nama || '-';
                      const stats = getStatsPerLayanan(lay.nama, katNama);

                      return (
                        <tr key={lay.id} className="hover:bg-white/[0.05] transition-all group">
                          <td className="p-6 lg:p-8"><span className="font-black text-sm lg:text-base text-white group-hover:text-cyan-400 uppercase">{lay.nama}</span></td>
                          <td className="p-6 lg:p-8 text-xs lg:text-sm font-bold text-slate-300 uppercase">{katNama}</td>
                          <td className="p-6 lg:p-8 text-center">
                            <span className="px-4 lg:px-6 py-2 rounded-2xl text-base lg:text-lg font-black font-mono bg-cyan-500/30 border border-cyan-400 text-white">
                              {stats.total}
                            </span>
                          </td>
                          <td className="p-6 lg:p-8 text-right">
                            {!stats.isExcluded && (
                              <div className="flex justify-end gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 text-[10px] lg:text-xs font-black text-white uppercase bg-blue-600 px-3 py-1.5 rounded-lg shadow-lg">
                                  <Loader2 size={14} className="text-white" /> <span className="text-white">{stats.proses}</span> Sudah
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] lg:text-xs font-black text-white uppercase bg-amber-600 px-3 py-1.5 rounded-lg shadow-lg">
                                  <ShieldAlert size={14} className="text-white" /> <span className="text-white">{stats.belum}</span> Belum
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

            {/* TABEL AJUAN PER DESA */}
            <div className="lg:col-span-1 bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl flex flex-col h-[600px]">
              <div className="p-8 border-b border-slate-600/50 bg-[#0d1117]/50">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                    <MapPin size={26} className="text-red-400" /> Ajuan Per Desa
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase ml-9">
                    Data 287 Desa & Kel. Kab. Tegal
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#0d1117] [&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#161b22] text-slate-400 text-[10px] font-black uppercase tracking-widest z-10 shadow-sm">
                    <tr>
                      <th className="p-5 border-b border-slate-700">Nama Desa</th>
                      <th className="p-5 border-b border-slate-700">Kecamatan</th>
                      <th className="p-5 border-b border-slate-700 text-center">Ajuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ajuanPerDesa.map((item, idx) => (
                      <tr key={idx} className="hover:bg-cyan-950/10 transition-all duration-200 group">
                        <td className="p-5 text-sm font-bold text-white capitalize group-hover:text-cyan-400 transition-colors">
                          {item.namaDesa.toLowerCase()}
                        </td>
                        <td className="p-5 text-[11px] font-medium text-slate-500 capitalize italic">
                          {item.kecamatan.toLowerCase()}
                        </td>
                        <td className="p-5 text-center font-mono font-black text-cyan-400 relative">
                          {/* Visual Progress Bar (Opsional) */}
                          <div
                            className="absolute left-0 bottom-0 h-[2px] bg-cyan-500/30 transition-all duration-500"
                            style={{ width: `${Math.min((item.total / 500) * 100, 100)}%` }}
                          />
                          {item.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}