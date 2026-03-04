"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart3, PieChart as PieIcon,
  ClipboardList, Activity, Loader2, ShieldAlert, MapPin, Users,
  CreditCard, Baby, FileMinus, Smartphone, Smile, FileText, Heart, UserX, Database
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- MAPPING ICON (String dari DB diubah jadi Komponen) ---
const IconMap = {
  Users,
  CreditCard,
  Baby,
  FileMinus,
  Smartphone,
  Smile,
  FileText,
  Heart,
  UserX,
  MapPin,
  Database
};

// --- FUNGSI RENDER ICON DINAMIS ---
const renderDynamicIcon = (iconName, size = 20, className = "") => {
  const IconComponent = IconMap[iconName] || Activity;
  return <IconComponent size={size} className={className} />;
};

export default function UserDashboard() {
  const [mounted, setMounted] = useState(false);
  const [laporanList, setLaporanList] = useState([]);
  const [kategoriData, setKategoriData] = useState([]);
  const [layananData, setLayananData] = useState([]);

  // --- STATE TAMBAHAN UNTUK FILTER & SORT ---
  const [selectedKecamatan, setSelectedKecamatan] = useState("SEMUA KECAMATAN");
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });

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
    jumlah, 
    is_verified,
    jenis_data ( 
      nama, 
      kelompok_data ( nama ) 
    )
  `);

    if (!error && data) {
      const formatted = data.map(item => {
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

  const handleSort = (key, direction) => {
    setSortConfig({ key, direction });
  };

  const totalAjuan = useMemo(() => {
    return laporanList.reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0);
  }, [laporanList]);

  const dataGrafikKategori = useMemo(() => {
    return kategoriData.map(kat => ({
      name: kat.nama,
      total: laporanList
        .filter(l => l.kategori === kat.nama)
        .reduce((acc, curr) => acc + Number(curr.jumlahOrang || 0), 0)
    }));
  }, [kategoriData, laporanList]);

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

  const sortedLayananData = useMemo(() => {
    const orderPriority = { 'Informasi Umum': 1, 'Pencatatan Sipil': 2, 'Pendaftaran Penduduk': 3 };
    return [...layananData].sort((a, b) => {
      const katA = kategoriData.find(k => k.id === a.id_kelompok_data)?.nama || 'N/A';
      const katB = kategoriData.find(k => k.id === b.id_kelompok_data)?.nama || 'N/A';
      return (orderPriority[katA] || 99) - (orderPriority[katB] || 99);
    });
  }, [layananData, kategoriData]);

  const genderStats = useMemo(() => {
    const laki = 735127;
    const perempuan = 715123;
    const total = laki + perempuan;

    return {
      laki,
      perempuan,
      total,
      persenLaki: ((laki / total) * 100).toFixed(1),
      persenPerempuan: ((perempuan / total) * 100).toFixed(1)
    };
  }, []);

  // --- LOGIKA DATA DESA DENGAN FILTER DROPDOWN & SORTING ---
  // --- LOGIKA DATA DESA DENGAN FILTER & SORTING (FIXED STRUCTURE) ---
  const sortedDesa = useMemo(() => {
    const kecamatanData = [
      { nama: "ADIWERNA", desa: ["Adiwerna", "Tembok Banjaran", "Lumingser", "Pedeslohor", "Ujungrusi", "Harjosari", "Pecabean", "Tembok Kidul", "Tembok Lor", "Tembok Luwung", "Kaliwadas", "Gumalar", "Bersole", "Pagiyanten", "Penarukan"] },
      { nama: "BALAPULANG", desa: ["Balapulang Kulon", "Balapulang Wetan", "Batuagung", "Banjaranyar", "Tembongwah", "Danareja", "Cibunar", "Bukateja", "Kaliwungu", "Karangjambu", "Pamiritan", "Seseupan", "Wotgalih"] },
      { nama: "BOJONG", desa: ["Bojong", "Rembul", "Tuwel", "Suniarsih", "Dukuhtengah", "Lengkong", "Batuunyana", "Buniwah", "Kalisari", "Karangmulyo", "Cikura", "Kedawung"] },
      { nama: "BUMIJAWA", desa: ["Bumijawa", "Guci", "Cempaka", "Sumbaga", "Sokatengah", "Sigedong", "Batunyana", "Begawat", "Carul", "Cintamanik", "Jejeg", "mulyajaya", "Prawpagan", "Sukasari", "Traju"] },
      { nama: "DUKUHTURI", desa: ["Dukuhturi", "Sidakaton", "Sidapurna", "Pagongan", "Kupu", "Lawatan", "Pengabean", "Bandasari", "Debong Wetan", "Grogol", "Kepandean", "Ketikerep", "Panggung"] },
      { nama: "DUKUHWARU", desa: ["Dukuhwaru", "Slarang Lor", "Gumayun", "Blubuk", "Sindang", "Pedagangan", "Kabunan", "Bulusari", "Gadung", "Kaligayam", "Sidadadi"] },
      { nama: "JATINEGARA", desa: ["Jatinegara", "Cerih", "Gantungan", "Wotgalih", "Tamansari", "Lebakwangi", "Argasari", "Capar", "Dukuhbangsa", "Kedungwungu", "Mulyoharjo", "Penyalin", "Sumurpanggang"] },
      { nama: "KEDUNGBANTENG", desa: ["Kedungbanteng", "Tonggara", "Penujah", "Karanganyar", "Margamulyo", "Semedo", "Dukuhjati", "Kebiringin", "Sumingkir"] },
      { nama: "KRAMAT", desa: ["Mejasem Barat", "Mejasem Timur", "Kramat", "Dampyak", "Kemantran", "Plumbungan", "Bongkok", "Babakan", "Dinuk", "Jatilawang", "Kertaharja", "Kertayasa", "Munjul", "Padaharja", "Tanjungharja"] },
      { nama: "LEBAKSIU", desa: ["Lebaksiu Lor", "Lebaksiu Kidul", "Yamansari", "Kajen", "Kesuben", "Tegalandong", "Babadan", "Dukuhdamu", "Dukuhtengah", "Kambangan", "Lebakgowah", "Pendawa", "Surentumyang"] },
      { nama: "MARGASARI", desa: ["Margasari", "Pakuja", "Jatilawang", "Kaligayam", "Wanasari", "Karangdawa", "Dukuh Tengah", "Kalisalak", "Marga Ayu", "Pekiringan", "Prupuk Selatan", "Prupuk Utara"] },
      { nama: "PAGERBARANG", desa: ["Pagerbarang", "Randusari", "Srengseng", "Kertaharja", "Sidomulyo", "Mulyoharjo", "Jatiwangi", "Karanganyar", "Margasari", "Rajegwesi", "Semboja"] },
      { nama: "PANGKAH", desa: ["Pangkah", "Bogares Kidul", "Bogares Lor", "Dermayu", "Talok", "Penyalahan", "Curug", "Bedug", "Dukuhjati", "Grobog Kulon", "Grobog Wetan", "Jenggawur", "Kendalserut", "Pener", "Rancawiru"] },
      { nama: "SLAWI", desa: ["Slawi Kulon", "Slawi Wetan", "Kudaile", "Trayeman", "Pakibar", "Dukuhwringin", "Kalisapu", "Dukuhsalam", "Kagok", "Procot"] },
      { nama: "SURADADI", desa: ["Suradadi", "Purwahamba", "Sidantaka", "Gembongdadi", "Harjosari", "Kertasari", "Jatibogor", "Boja", "Karangmulya", "Karangwuluh", "Sidoharjo"] },
      { nama: "TALANG", desa: ["Talang", "Pesayangan", "Pegirikan", "Kebasen", "Gembong Kulon", "Langenharjo", "Wangandawa", "Bengle", "Cangkring", "Dawuhan", "Dukuhmalang", "Gembong Wetan", "Kajen", "Kaladawa", "Pasangan", "Tegalwangi"] },
      { nama: "TARUB", desa: ["Tarub", "Mindaka", "Lebeteng", "Kedungbungkus", "Singamerta", "Bulakwaru", "Bumiharja", "Bregas", "Kabukan", "Kalirayu", "Karangmangu", "Kedokansayang", "Margapadang", "Purbasana", "Setu"] },
      { nama: "WARUREJA", desa: ["Warureja", "Kedungkelor", "Sukareja", "Banjaragung", "Sidamulya", "Kendayakan", "Banjaranyar", "Demangharjo", "Kedungjati", "Kreman", "Rangimulya", "Sigentong"] }
    ];

    // 1. Flattening data
    let flatData = [];
    kecamatanData.forEach((kec) => {
      kec.desa.forEach((namaDesa) => {
        const seed = namaDesa.length + kec.nama.length;
        const totalFake = (seed * 17) % 300 + 50;
        flatData.push({
          namaDesa: namaDesa,
          kecamatan: kec.nama,
          total: totalFake
        });
      });
    });

    // 2. Filter
    let filtered = (selectedKecamatan === "SEMUA KECAMATAN")
      ? flatData
      : flatData.filter(d => d.kecamatan === selectedKecamatan);

    // 3. Sorting
    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'total') {
        return sortConfig.direction === 'asc' ? a.total - b.total : b.total - a.total;
      }
      return a.namaDesa.localeCompare(b.namaDesa);
    });
  }, [selectedKecamatan, sortConfig]);

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

            <div className="bg-[#161b22] border border-slate-700 p-6 rounded-[2rem] flex items-center gap-6 shadow-2xl min-w-[450px]">
              <div className="flex-1 w-full text-center md:text-left">
                <p className="text-xs text-slate-300 font-black uppercase tracking-widest mb-1 flex items-center justify-center md:justify-start gap-2">
                  <Users size={14} className="text-cyan-400" /> Jumlah Penduduk
                </p>
                <p className="text-2xl font-black text-white mb-3">
                  {genderStats.total.toLocaleString('id-ID')} <span className="text-sm font-medium text-slate-400">Jiwa</span>
                </p>

                <div className="flex justify-center md:justify-start gap-6">
                  <div>
                    <span className="text-[10px] text-slate-100 font-bold uppercase tracking-wider">Laki-laki</span>
                    <p className="text-lg font-black text-blue-400">
                      {genderStats.laki.toLocaleString('id-ID')} <span className="text-xs text-blue-200">({genderStats.persenLaki}%)</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-100 font-bold uppercase tracking-wider">Perempuan</span>
                    <p className="text-lg font-black text-pink-400">
                      {genderStats.perempuan.toLocaleString('id-ID')} <span className="text-xs text-pink-200">({genderStats.persenPerempuan}%)</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(value) => value.toLocaleString('id-ID')}
                      contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #334155', borderRadius: '12px', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Pie
                      data={[
                        { name: 'Laki-laki', value: genderStats.laki },
                        { name: 'Perempuan', value: genderStats.perempuan }
                      ]}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#22d3ee" />
                      <Cell fill="#f472b6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Users size={24} className="text-slate-600" />
                </div>
              </div>
            </div>
          </header>

          {/* MIDDLE SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
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
                      cy="45%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                    >
                      {siPanduData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => value.toLocaleString('id-ID')}
                      contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #334155', borderRadius: '12px', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-40px]">
                  <span className="text-4xl font-black text-white">{totalAjuan}</span>
                  <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-widest">Total Ajuan</span>
                </div>
              </div>
            </div>

            <div className="bg-[#161b22] p-10 rounded-[2.5rem] border border-slate-600 shadow-2xl h-[480px] flex flex-col relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-4">
                  <BarChart3 size={28} className="text-cyan-400" /> Statistik Kategori
                </h3>
                <div className="bg-[#0d1117] border border-cyan-500/30 px-6 py-3 rounded-xl text-right shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total Ajuan</p>
                  <p className="text-3xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] tracking-tight">
                    {totalAjuan}
                  </p>
                </div>
              </div>
              <div className="flex-1 w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGrafikKategori} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                    <XAxis dataKey="name" stroke="#f1f5f9" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} interval={0} />
                    <YAxis stroke="#f1f5f9" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #22d3ee', borderRadius: '15px', fontSize: '14px' }} />
                    <Bar dataKey="total" fill="#22d3ee" radius={[10, 10, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* TABEL PELAYANAN */}
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
                          <td className="p-6 lg:p-8">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-cyan-900/40 transition-colors">
                                {renderDynamicIcon(lay.icon, 20, "text-slate-300 group-hover:text-cyan-400")}
                              </div>
                              <span className="font-black text-sm lg:text-base text-white group-hover:text-cyan-400 uppercase">{lay.nama}</span>
                            </div>
                          </td>
                          <td className="p-6 lg:p-8 text-xs lg:text-sm font-bold text-slate-300 uppercase">{katNama}</td>
                          <td className="p-6 lg:p-8 text-center">
                            <span className="px-4 lg:px-6 py-2 rounded-2xl text-base lg:text-lg font-black font-mono bg-cyan-500/30 border border-cyan-400 text-white">{stats.total}</span>
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

            {/* TABEL DESA DENGAN DROPDOWN */}
            <div className="lg:col-span-1 bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl flex flex-col h-[600px]">
              <div className="p-8 border-b border-slate-600/50 bg-[#0d1117]/50">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                      <MapPin size={26} className="text-red-400" /> Ajuan Per Desa
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase ml-9">
                      Data 287 Desa & Kel. Kab. Tegal
                    </p>
                  </div>

                  <div className="ml-9 flex flex-wrap gap-2 items-center">
                    <div className="relative">
                      <select
                        value={selectedKecamatan}
                        onChange={(e) => setSelectedKecamatan(e.target.value)}
                        className={`appearance-none bg-[#0d1117] px-4 py-1.5 pr-8 rounded-full text-[9px] font-bold border transition-all cursor-pointer outline-none
                          ${selectedKecamatan !== "SEMUA KECAMATAN"
                            ? 'border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        <option value="SEMUA KECAMATAN">SEMUA KECAMATAN</option>
                        <option value="ADIWERNA">ADIWERNA</option>
                        <option value="BALAPULANG">BALAPULANG</option>
                        <option value="BOJONG">BOJONG</option>
                        <option value="BUMIJAWA">BUMIJAWA</option>
                        <option value="DUKUHWARU">DUKUHWARU</option>
                        <option value="DUKUHTURI">DUKUHTURI</option>
                        <option value="JATINEGARA">JATINEGARA</option>
                        <option value="KRAMAT">KRAMAT</option>
                        <option value="KEDUNGBANTENG">KEDUNGBANTENG</option>
                        <option value="LEBAKSIU">LEBAKSIU</option>
                        <option value="MARGASARI">MARGASARI</option>
                        <option value="PAGERBARANG">PAGERBARANG</option>
                        <option value="PANGKAH">PANGKAH</option>
                        <option value="SLAWI">SLAWI</option>
                        <option value="SURADADI">SURADADI</option>
                        <option value="TALANG">TALANG</option>
                        <option value="TARUB">TARUB</option>
                        <option value="WARUREJA">WARUREJA</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="fill-current h-3 w-3" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSort('total', 'desc')}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all ${sortConfig.key === 'total' && sortConfig.direction === 'desc' ? 'bg-cyan-500 text-white border-cyan-500' : 'text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    >
                      TERBANYAK
                    </button>
                    <button
                      onClick={() => handleSort('total', 'asc')}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-all ${sortConfig.key === 'total' && sortConfig.direction === 'asc' ? 'bg-cyan-500 text-white border-cyan-500' : 'text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    >
                      TERKECIL
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#0d1117] [&::-webkit-scrollbar-thumb]:bg-slate-700">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#161b22] text-white text-[10px] font-black uppercase tracking-widest z-10 shadow-sm">
                    <tr>
                      <th className="p-5 border-b border-slate-700">Nama Desa</th>
                      <th className="p-5 border-b border-slate-700">Kecamatan</th>
                      <th className="p-5 border-b border-slate-700 text-center">Ajuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedDesa.map((item, idx) => (
                      <tr key={idx} className="hover:bg-cyan-950/10 transition-all duration-200 group">
                        <td className="p-5 text-sm font-bold text-white capitalize group-hover:text-cyan-400">
                          {item.namaDesa.toLowerCase()}
                        </td>
                        <td className="p-5 text-[11px] font-medium text-white capitalize italic">
                          {item.kecamatan.toLowerCase()}
                        </td>
                        <td className="p-5 text-center font-mono font-black text-white relative">
                          <div className="absolute left-0 bottom-0 h-[2px] bg-cyan-500/30 transition-all duration-500" style={{ width: `${Math.min((item.total / 500) * 100, 100)}%` }} />
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