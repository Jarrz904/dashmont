"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import DonutChartHero from '@/components/DonutChartHero';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, Calendar, Clock, Database, Layers,
  TrendingUp, BarChart3, Edit3, Save, X, CheckCircle2, AlertCircle,
  PieChart as PieIcon, ClipboardList, Activity, ShieldCheck, ShieldAlert, Loader2, MapPin, Users,
  RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';


export default function DashboardPage() {
  const [currentPage, setCurrentPage] = useState('Dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ show: false, id: null });
  const [verifyModal, setVerifyModal] = useState({ show: false, data: null });

  const [laporanList, setLaporanList] = useState([]);
  const [kategoriData, setKategoriData] = useState([]);
  const [layananData, setLayananData] = useState([]);

  const [form, setForm] = useState({
    kategori: 'Pendaftaran Penduduk',
    layanan: 'Perekaman KTP',
    jumlahOrang: '',
  });

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

  // --- LOGIKA PENGURUTAN LAYANAN ---
  const sortedLayananData = useMemo(() => {
    const orderPriority = {
      'Informasi Umum': 1,
      'Pencatatan Sipil': 2,
      'Pendaftaran Penduduk': 3
    };
    return [...layananData].sort((a, b) => {
      const katA = kategoriData.find(k => k.id === a.id_kelompok_data)?.nama || 'Z';
      const katB = kategoriData.find(k => k.id === b.id_kelompok_data)?.nama || 'Z';
      return (orderPriority[katA] || 99) - (orderPriority[katB] || 99);
    });
  }, [layananData, kategoriData]);

  // --- FUNGSI FETCH ---
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
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchInitialData();
    fetchLaporan();
    return () => clearInterval(timer);
  }, [fetchInitialData, fetchLaporan]);

  // --- LOGIKA DATA ---
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const availableLayanan = useMemo(() => {
    const selectedKatObj = kategoriData.find(k => k.nama === form.kategori);
    return selectedKatObj ? layananData.filter(l => l.id_kelompok_data === selectedKatObj.id) : [];
  }, [form.kategori, kategoriData, layananData]);

  // LOGIKA PENGECUALIAN STATISTIK
  const getStatsPerLayanan = (layananNama) => {
    const items = laporanList.filter(l => l.layanan === layananNama);
    const katNama = items.length > 0 ? items[0].kategori : '';
    const total = items.reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);

    const isExcluded = layananNama === 'Aktivasi IKD' ||
      layananNama === 'Blanko KTP' ||
      katNama === 'Informasi Umum';

    const verified = isExcluded ? 0 : items
      .filter(i => i.isVerified)
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);

    const unverified = isExcluded ? 0 : items
      .filter(i => !i.isVerified)
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);

    return { total, verified, unverified, isExcluded };
  };

  const getTotalPerGrup = (grupName) => {
    return laporanList
      .filter(l => l.kategori === grupName)
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
  };

  const dataGrafikKategori = useMemo(() => {
    return kategoriData.map(kat => ({
      name: kat.nama,
      total: getTotalPerGrup(kat.nama)
    }));
  }, [laporanList, kategoriData]);

  const siPanduData = useMemo(() => {
    const totalDiProses = laporanList.filter(l => l.isVerified).reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
    const totalBelumDiProses = laporanList.filter(l => !l.isVerified).reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);
    const totalTerbitTTE = 0;

    return [
      { name: 'Di Proses', value: totalDiProses, color: '#3b82f6' },
      { name: 'Belum Di Proses', value: totalBelumDiProses, color: '#f59e0b' },
      { name: 'Terbit TTE', value: totalTerbitTTE, color: '#10b981' }
    ];
  }, [laporanList]);

  const totalAjuan = laporanList.reduce((a, b) => a + Number(b.jumlahOrang), 0);

  // --- HANDLERS ---
  const handleKategoriChange = (e) => {
    const selectedKat = e.target.value;
    const katObj = kategoriData.find(k => k.nama === selectedKat);
    const firstLayanan = layananData.find(l => l.id_kelompok_data === katObj?.id);
    setForm({ ...form, kategori: selectedKat, layanan: firstLayanan ? firstLayanan.nama : '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jumlahOrang) return;
    const selectedLayananObj = layananData.find(l => l.nama === form.layanan);
    if (!selectedLayananObj) return;

    if (isEditing) {
      const { error } = await supabase.from('isi_data').update({
        id_jenis_data: selectedLayananObj.id,
        jumlah: Number(form.jumlahOrang)
      }).eq('id', editId);

      if (!error) {
        showToast('Data diperbarui!');
        await fetchLaporan();
        setIsEditing(false);
        setEditId(null);
        setForm({ ...form, jumlahOrang: '' });
      } else {
        showToast('Gagal memperbarui data', 'error');
      }
    } else {
      const { error } = await supabase.from('isi_data').insert([{
        id_jenis_data: selectedLayananObj.id,
        jumlah: Number(form.jumlahOrang),
        is_verified: false
      }]);

      if (!error) {
        showToast('Data disimpan!');
        await fetchLaporan();
        setForm({ ...form, jumlahOrang: '' });
      } else {
        showToast('Gagal menyimpan data', 'error');
      }
    }
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from('isi_data').delete().eq('id', deleteModal.id);
    if (!error) {
      showToast('Data dihapus', 'error');
      await fetchLaporan();
    }
    setDeleteModal({ show: false, id: null });
  };

  const handleConfirmVerify = async () => {
    if (!verifyModal.data || !verifyModal.data.id) return;

    try {
      const { error } = await supabase
        .from('isi_data')
        .update({ is_verified: true })
        .eq('id', verifyModal.data.id)
        .select();

      if (error) throw error;

      showToast('Data Berhasil Diproses!');
      await fetchLaporan();
    } catch (error) {
      console.error("Error proses:", error);
      showToast('Gagal memproses ke database', 'error');
    } finally {
      setVerifyModal({ show: false, data: null });
    }
  };

  const handleVerify = (item) => {
    setVerifyModal({ show: true, data: item });
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full bg-[#0d1117] overflow-hidden text-white font-sans relative">
      <Sidebar setCurrentPage={setCurrentPage} currentPage={currentPage} />

      <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 pointer-events-none">
        {toast.show && (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-bounce pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
            }`}>
            {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-black text-sm tracking-widest uppercase">{toast.message}</span>
          </div>
        )}
      </div>

      {deleteModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-red-500/50 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
            <div className="text-red-500 mb-6 flex justify-center"><AlertCircle size={48} /></div>
            <h3 className="text-xl font-black text-white text-center mb-6">Hapus Data Ini?</h3>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ show: false, id: null })} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-white transition-colors border border-slate-500">BATAL</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors border border-red-400 shadow-lg">HAPUS</button>
            </div>
          </div>
        </div>
      )}

      {verifyModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-blue-500/50 p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <div className="text-blue-500 mb-6 flex justify-center"><RefreshCw size={56} className="animate-spin-slow" /></div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Proses Data</h3>
            <p className="text-white text-center mb-6 text-sm">Apakah Anda yakin ingin mulai memproses layanan <span className="text-blue-400 font-bold underline">{verifyModal.data?.layanan}</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setVerifyModal({ show: false, data: null })} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-white transition-colors border border-slate-500">BATAL</button>
              <button onClick={handleConfirmVerify} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black transition-colors border border-blue-400 shadow-lg uppercase">PROSES SEKARANG</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-[#0d1117]">
        <div className="max-w-[1440px] mx-auto">
          {/* HEADER SECTION - Data Penduduk & Info Dashboard */}
          <header className="flex flex-col xl:flex-row justify-between items-stretch mb-8 gap-6">
            <div className="flex-1 bg-[#161b22] p-8 rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col justify-center">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-1">
                PUBLIK <span className="text-cyan-400">DASHBOARD</span>
              </h1>
              <p className="text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase opacity-80">
                Layanan Informasi Real-Time • KABUPATEN TEGAL
              </p>
              <div className="flex items-center gap-3 mt-4">
                <span className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-700">
                  <Calendar size={12} className="text-cyan-400" /> {currentTime.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </span>
                <span className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg text-[10px] font-mono text-emerald-400 border border-slate-700">
                  <Clock size={12} /> {currentTime.toLocaleTimeString('id-ID')}
                </span>
              </div>
            </div>

            {/* Card Info Penduduk - Pojok Kanan Atas */}
            <div className="bg-[#161b22] border border-slate-700 p-6 rounded-[2rem] flex items-center gap-6 shadow-2xl min-w-[450px]">
              <div className="flex-1 w-full text-center md:text-left">
                <p className="text-xs text-slate-300 font-black uppercase tracking-widest mb-1 flex items-center justify-center md:justify-start gap-2">
                  <Users size={14} className="text-cyan-400" /> Total Penduduk Kab. Tegal
                </p>
                <p className="text-2xl font-black text-white mb-3">1.450.250 <span className="text-sm font-medium text-slate-400">Jiwa</span></p>
                <div className="flex justify-center md:justify-start gap-6">
                  <div>
                    <span className="text-[10px] text-slate-100 font-bold uppercase tracking-wider">Laki-laki</span>
                    <p className="text-lg font-black text-blue-400">735.127 <span className="text-xs text-blue-200">(50.7%)</span></p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-100 font-bold uppercase tracking-wider">Perempuan</span>
                    <p className="text-lg font-black text-pink-400">715.123 <span className="text-xs text-pink-200">(49.3%)</span></p>
                  </div>
                </div>
              </div>

              {/* Diagram Lingkaran Kecil (Gender) */}
              <div className="relative w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Laki-laki', value: 870211, color: '#22d3ee' },
                        { name: 'Perempuan', value: 842292, color: '#f472b6' }
                      ]}
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#22d3ee" stroke="none" />
                      <Cell fill="#f472b6" stroke="none" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Users size={12} className="text-slate-600" />
                </div>
              </div>
            </div>
          </header>

          {currentPage === 'Dashboard' ? (
            <div className="space-y-8 animate-in fade-in duration-700">
              {/* ROW 1: CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Status Verifikasi (Pie Chart) */}
                <div className="lg:col-span-6 bg-[#161b22] p-8 rounded-[2rem] border border-slate-800 shadow-2xl relative flex flex-col">
                  <div className="flex items-center gap-3 mb-8">
                    <Clock size={20} className="text-pink-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Status Verifikasi</h3>
                  </div>
                  <div className="h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={siPanduData}
                          innerRadius={75}
                          outerRadius={95}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {siPanduData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
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
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-5xl font-black text-white">{totalAjuan}</span>
                      <span className="text-xs text-slate-300 font-bold uppercase tracking-widest">Total Ajuan</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    {siPanduData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-xs font-bold text-slate-200 uppercase">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistik Kategori (Bar Chart) */}
                <div className="lg:col-span-6 bg-[#161b22] p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <BarChart3 size={20} className="text-cyan-400" />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Statistik Kategori</h3>
                    </div>
                    <div className="bg-[#0d1117] border border-cyan-500/30 px-8 py-4 rounded-xl text-right shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                      <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mb-1">Total Ajuan</p>
                      <p className="text-4xl font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] tracking-tight">
                        {totalAjuan}
                      </p>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataGrafikKategori}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#e2e8f0" fontSize={12} fontWeight="bold" axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#e2e8f0" fontSize={12} fontWeight="bold" axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #06b6d4', borderRadius: '15px', color: '#fff' }}
                        />
                        <Bar dataKey="total" fill="#22d3ee" radius={[6, 6, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>



              {/* BOTTOM SECTION: Dibagi 2 (Pelayanan & Desa) dengan Lebar Sama */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* TABEL PELAYANAN (Sekarang Lebar Sama dengan Tabel Desa) */}
                <div className="bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl flex flex-col h-[600px]">
                  <div className="p-8 border-b border-slate-600">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase">
                      <ClipboardList size={26} className="text-emerald-400" /> Pelayanan
                    </h3>
                  </div>
                  <div className="overflow-x-auto flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#0d1117] [&::-webkit-scrollbar-thumb]:bg-slate-700">
                    <table className="w-full text-left relative">
                      <thead className="sticky top-0 bg-[#0d1117] text-white text-xs font-black uppercase tracking-widest z-10 shadow-md">
                        <tr>
                          <th className="p-6 lg:p-8 border-b border-slate-600">Jenis Layanan</th>
                          <th className="p-6 lg:p-8 border-b border-slate-600">Kelompok Data</th>
                          <th className="p-6 lg:p-8 border-b border-slate-600 text-center">Total</th>
                          <th className="p-6 lg:p-8 border-b border-slate-600 text-right">Verifikasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-600">
                        {sortedLayananData.map((lay) => {
                          const katNama = kategoriData.find(k => k.id === lay.id_kelompok_data)?.nama || '-';
                          // Fungsi Anda mengembalikan objek: { total, verified, unverified, isExcluded }
                          const stats = getStatsPerLayanan(lay.nama, katNama);

                          return (
                            <tr key={lay.id} className="hover:bg-white/[0.05] transition-all group">
                              <td className="p-6 lg:p-8">
                                <span className="font-black text-sm lg:text-base text-white group-hover:text-cyan-400 uppercase">{lay.nama}</span>
                              </td>
                              <td className="p-6 lg:p-8 text-xs lg:text-sm font-bold text-slate-100 uppercase">{katNama}</td>
                              <td className="p-6 lg:p-8 text-center">
                                <span className="px-4 lg:px-6 py-2 rounded-2xl text-base lg:text-lg font-black font-mono bg-cyan-500/30 border border-cyan-400 text-white">
                                  {stats.total || 0}
                                </span>
                              </td>
                              <td className="p-6 lg:p-8 text-right">
                                {!stats.isExcluded && (
                                  <div className="flex justify-end gap-2 flex-wrap">
                                    {/* Perbaikan: Gunakan stats.verified sesuai dengan return fungsi Anda */}
                                    <span className="inline-flex items-center gap-1.5 text-[10px] lg:text-xs font-black text-white uppercase bg-blue-600 px-3 py-1.5 rounded-lg shadow-lg">
                                      <Loader2 size={14} className="text-white" />
                                      <span className="text-white">{stats.verified || 0}</span> Sudah
                                    </span>
                                    {/* Perbaikan: Gunakan stats.unverified sesuai dengan return fungsi Anda */}
                                    <span className="inline-flex items-center gap-1.5 text-[10px] lg:text-xs font-black text-white uppercase bg-amber-600 px-3 py-1.5 rounded-lg shadow-lg">
                                      <ShieldAlert size={14} className="text-white" />
                                      <span className="text-white">{stats.unverified || 0}</span> Belum
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

                {/* TABEL AJUAN PER DESA (Sekarang Lebar Sama dengan Tabel Pelayanan) */}
                <div className="bg-[#161b22] rounded-[2.5rem] border border-slate-600 overflow-hidden shadow-2xl flex flex-col h-[600px]">
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
                      <thead className="sticky top-0 bg-[#161b22] text-slate-100 text-[10px] font-black uppercase tracking-widest z-10 shadow-sm">
                        <tr>
                          <th className="p-5 border-b border-slate-100">Nama Desa</th>
                          <th className="p-5 border-b border-slate-100">Kecamatan</th>
                          <th className="p-5 border-b border-slate-100 text-center">Ajuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {ajuanPerDesa.map((item, idx) => (
                          <tr key={idx} className="hover:bg-cyan-950/10 transition-all duration-200 group">
                            <td className="p-5 text-sm font-bold text-white capitalize group-hover:text-cyan-400 transition-colors">
                              {item.namaDesa.toLowerCase()}
                            </td>
                            <td className="p-5 text-sm font-bold text-white capitalize">
                              {item.kecamatan.toLowerCase()}
                            </td>
                            <td className="p-5 text-center font-mono font-black text-white relative">
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
          ) : (


            /* FORM INPUT SECTION - Mengikuti gaya Cyber-Dark */
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <section className={`bg-[#161b22] p-8 rounded-3xl border transition-all duration-300 shadow-2xl ${isEditing ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-2xl font-black flex items-center gap-3 ${isEditing ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {isEditing ? <Edit3 size={26} /> : <Layers size={26} />}
                    {isEditing ? 'UPDATE DATA LAYANAN' : 'TAMBAH DATA BARU'}
                  </h2>
                  {isEditing && (
                    <button onClick={() => { setIsEditing(false); setEditId(null); setForm({ ...form, jumlahOrang: '' }); }} className="text-xs font-black text-white flex items-center gap-2 bg-slate-700 hover:bg-red-600 px-4 py-2 rounded-xl transition-all border border-slate-500">
                      <X size={14} /> BATAL EDIT
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-white block uppercase tracking-wider">Pilih Kategori</label>
                    <select value={form.kategori} onChange={handleKategoriChange} className="w-full bg-[#0d1117] border border-slate-500 p-4 rounded-xl text-white font-black text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all cursor-pointer">
                      {kategoriData.map(kat => <option key={kat.id} value={kat.nama} className="bg-[#0d1117]">{kat.nama}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-white block uppercase tracking-wider">Jenis Layanan</label>
                    <select value={form.layanan} onChange={(e) => setForm({ ...form, layanan: e.target.value })} className="w-full bg-[#0d1117] border border-slate-500 p-4 rounded-xl text-white font-black text-sm outline-none focus:border-cyan-400 transition-all cursor-pointer">
                      {availableLayanan.map(lay => <option key={lay.id} value={lay.nama} className="bg-[#0d1117]">{lay.nama}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-white block uppercase tracking-wider">Jumlah Ajuan</label>
                    <input type="number" required placeholder="0" value={form.jumlahOrang} onChange={(e) => setForm({ ...form, jumlahOrang: e.target.value })} className="w-full bg-[#0d1117] border border-slate-500 p-4 rounded-xl text-white font-black text-sm outline-none focus:border-cyan-400 transition-all placeholder:text-slate-600" />
                  </div>
                  <button type="submit" className={`font-black h-[56px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl text-sm uppercase tracking-widest border border-white/20 ${isEditing ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20' : 'bg-cyan-500 text-[#0d1117] hover:bg-cyan-400 shadow-cyan-500/20'}`}>
                    {isEditing ? <Save size={20} /> : <Plus size={20} />} {isEditing ? 'UPDATE DATA' : 'SIMPAN DATA'}
                  </button>
                </form>
              </section>

              <div className="bg-[#161b22] rounded-3xl border border-slate-600 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-[#0d1117] text-white text-xs font-black uppercase tracking-widest border-b border-slate-600">
                    <tr>
                      <th className="p-6">Kategori & Waktu</th>
                      <th className="p-6">Jenis Layanan</th>
                      <th className="p-6 text-center">Ajuan</th>
                      <th className="p-6 text-center">Status</th>
                      <th className="p-6 text-right">Aksi Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600">
                    {laporanList.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.06] transition-all group">
                        <td className="p-6">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] w-fit bg-cyan-600 border border-cyan-400 px-3 py-1 rounded-lg text-white font-black uppercase shadow-sm">
                              {item.kategori}
                            </span>
                            <span className="text-xs text-white font-black">
                              {item.tanggalFull} • {item.jam.slice(0, 5)}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 font-black text-white uppercase text-base tracking-tight">{item.layanan}</td>
                        <td className="p-6 text-center">
                          <span className="text-3xl font-black text-cyan-400 font-mono drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{item.jumlahOrang}</span>
                        </td>
                        <td className="p-6 text-center">
                          {item.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white uppercase bg-blue-600 px-3 py-1 rounded-lg border border-blue-400 shadow-sm">
                              <RefreshCw size={12} /> Di Proses
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white uppercase bg-amber-600 px-3 py-1 rounded-lg border border-amber-400 shadow-sm">
                              <Loader2 size={12} className="animate-spin" /> Belum Di Proses
                            </span>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-3">
                            {!item.isVerified && (
                              <button
                                onClick={() => handleVerify(item)}
                                title="Proses Layanan"
                                className="bg-blue-600 text-white border border-blue-400 hover:bg-blue-500 p-2.5 rounded-xl transition-all shadow-lg active:scale-95"
                              >
                                <RefreshCw size={20} />
                              </button>
                            )}
                            <button onClick={() => { setIsEditing(true); setEditId(item.id); setForm({ kategori: item.kategori, layanan: item.layanan, jumlahOrang: item.jumlahOrang }); }} className="text-white hover:text-white p-2.5 bg-slate-700 hover:bg-amber-600 rounded-xl border border-slate-500 transition-all shadow-lg active:scale-95"><Edit3 size={20} /></button>
                            <button onClick={() => setDeleteModal({ show: true, id: item.id })} className="text-white hover:text-white p-2.5 bg-slate-700 hover:bg-red-600 rounded-xl border border-slate-500 transition-all shadow-lg active:scale-95"><Trash2 size={20} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};