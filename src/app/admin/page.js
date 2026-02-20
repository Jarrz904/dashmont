"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import DonutChartHero from '@/components/DonutChartHero';
import StatCard from '@/components/StatCard';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, Calendar, Clock, Database, Layers,
  TrendingUp, BarChart3, Edit3, Save, X, CheckCircle2, AlertCircle,
  PieChart as PieIcon, ClipboardList, Activity, ShieldCheck, ShieldAlert
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

  const getStatsPerLayanan = (layananNama) => {
    const items = laporanList.filter(l => l.layanan === layananNama);
    const total = items.reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);

    const verified = items
      .filter(i => i.isVerified)
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);

    const unverified = items
      .filter(i => !i.isVerified)
      .reduce((acc, curr) => acc + Number(curr.jumlahOrang), 0);

    return { total, verified, unverified };
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

  const siPanduData = [
    { name: 'Selesai', value: 45, color: '#10b981' },
    { name: 'Proses', value: 25, color: '#3b82f6' },
    { name: 'Antrian', value: 30, color: '#f59e0b' },
  ];

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

      showToast('Data Berhasil Diverifikasi!');
      await fetchLaporan();
    } catch (error) {
      console.error("Error verifikasi:", error);
      showToast('Gagal verifikasi database', 'error');
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

      {/* TOAST */}
      <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 pointer-events-none">
        {toast.show && (
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-bounce pointer-events-auto ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
            }`}>
            {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-black text-sm tracking-widest uppercase">{toast.message}</span>
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
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

      {/* VERIFY MODAL */}
      {verifyModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-emerald-500/50 p-8 rounded-3xl max-w-md w-full shadow-2xl">
            <div className="text-emerald-500 mb-6 flex justify-center"><ShieldCheck size={56} /></div>
            <h3 className="text-2xl font-black text-white text-center mb-2">Verifikasi Data</h3>
            <p className="text-white text-center mb-6 text-sm">Apakah Anda yakin ingin memverifikasi layanan <span className="text-emerald-400 font-bold underline">{verifyModal.data?.layanan}</span> dengan total <span className="text-cyan-400 font-bold">{verifyModal.data?.jumlahOrang} ajuan</span>?</p>
            <div className="flex gap-3">
              <button onClick={() => setVerifyModal({ show: false, data: null })} className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-white transition-colors border border-slate-500">BATAL</button>
              <button onClick={handleConfirmVerify} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-colors border border-emerald-400 shadow-lg uppercase">VERIFIKASI SEKARANG</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-[1440px] mx-auto">

          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-slate-900/80 p-6 rounded-3xl border border-white/20 gap-4 shadow-xl">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase tracking-[0.2em]">Sistem Monitoring</h1>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-slate-500">
                  <Calendar size={14} className="text-cyan-400" /> {currentTime.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </span>
                <span className="flex items-center gap-2 bg-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-300 border border-emerald-500/40">
                  <Clock size={14} /> {currentTime.toLocaleTimeString('id-ID')}
                </span>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-500 p-4 rounded-2xl flex items-center gap-6 shadow-2xl">
              <div className="text-right">
                <p className="text-xs text-white font-black uppercase tracking-widest mb-1">Total Pengajuan</p>
                <p className="text-4xl font-black text-cyan-400 leading-none">
                  {laporanList.reduce((a, b) => a + Number(b.jumlahOrang), 0)}
                </p>
              </div>
              <div className="bg-cyan-500/20 p-3 rounded-xl text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Activity size={28} />
              </div>
            </div>
          </header>

          {currentPage === 'Dashboard' ? (
            <div className="space-y-8 animate-in fade-in duration-700">

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#161b22] p-8 rounded-[2rem] border border-slate-600 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                      <BarChart3 size={20} className="text-cyan-400" /> Grafik per Kelompok Data
                    </h3>
                    <div className="flex gap-2 items-center">
                      <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                      <span className="text-xs font-bold text-white">Satuan: ajuan</span>
                    </div>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dataGrafikKategori}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                        <XAxis dataKey="name" stroke="#f1f5f9" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                        <YAxis stroke="#f1f5f9" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                          contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #22d3ee', borderRadius: '15px', color: '#fff' }}
                        />
                        <Bar dataKey="total" fill="#22d3ee" radius={[8, 8, 0, 0]} barSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#161b22] p-8 rounded-[2rem] border border-slate-600 shadow-2xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                    <PieIcon size={20} className="text-pink-400" /> Status Si Pandu (Online)
                  </h3>
                  <div className="h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={siPanduData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {siPanduData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                      <span className="text-2xl font-black text-white">100%</span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">Realtime</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: TABEL STATUS LAYANAN */}
              <div className="bg-[#161b22] rounded-[2rem] border border-slate-600 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-slate-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase">
                      <ClipboardList size={22} className="text-emerald-400" /> Rekap Verifikasi Layanan
                    </h3>
                    <p className="text-sm text-cyan-300 font-bold mt-1 uppercase tracking-tight">Akumulasi jumlah ajuan yang telah divalidasi</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0d1117] text-white text-xs font-black uppercase tracking-widest border-b border-slate-600">
                      <tr>
                        <th className="p-6">Jenis Layanan</th>
                        <th className="p-6">Kelompok Data</th>
                        <th className="p-6 text-center">Total Ajuan</th>
                        <th className="p-6 text-right">Rincian Ajuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-600">
                      {layananData.map((lay) => {
                        const stats = getStatsPerLayanan(lay.nama);
                        return (
                          <tr key={lay.id} className="hover:bg-white/[0.06] transition-all group">
                            {/* JENIS LAYANAN */}
                            <td className="p-6">
                              <span className="font-black text-base text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
                                {lay.nama}
                              </span>
                            </td>

                            {/* KELOMPOK DATA */}
                            <td className="p-6">
                              <span className="font-black text-base text-white uppercase tracking-tight">
                                {kategoriData.find(k => k.id === lay.id_kelompok_data)?.nama || '-'}
                              </span>
                            </td>

                            {/* TOTAL AJUAN */}
                            <td className="p-6 text-center">
                              <span className={`px-6 py-2.5 rounded-xl text-lg font-black font-mono border ${stats.total > 0 ? 'bg-cyan-500/40 text-white border-cyan-400' : 'bg-slate-800 text-white/40 border-slate-700'}`}>
                                {stats.total}
                              </span>
                            </td>

                            {/* RINCIAN AJUAN - Teks Putih Jelas & Container Transparan */}
                            <td className="p-6 text-right">
                              <div className="flex flex-col items-end gap-2">
                                {/* Item Sudah Verifikasi */}
                                <div className="flex items-center justify-between gap-6 min-w-[210px] px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                                  <span className="flex items-center gap-2 text-[11px] font-black text-white uppercase tracking-wider">
                                    <CheckCircle2 size={14} className="text-emerald-400" /> Sudah Verifikasi
                                  </span>
                                  <span className="text-base font-black text-white font-mono">
                                    {stats.verified}
                                  </span>
                                </div>

                                {/* Item Belum Verifikasi */}
                                <div className="flex items-center justify-between gap-6 min-w-[210px] px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10">
                                  <span className="flex items-center gap-2 text-[11px] font-black text-white uppercase tracking-wider">
                                    <ShieldAlert size={14} className="text-amber-400" /> Belum Verifikasi
                                  </span>
                                  <span className="text-base font-black text-white font-mono">
                                    {stats.unverified}
                                  </span>
                                </div>
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
          ) : (
            /* PAGE INPUT DATA */
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
                              {/* Menggunakan slice untuk mengambil HH:mm saja */}
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white uppercase bg-emerald-600 px-3 py-1 rounded-lg border border-emerald-400 shadow-sm">
                              <CheckCircle2 size={12} /> Terverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white uppercase bg-red-600 px-3 py-1 rounded-lg border border-red-400 shadow-sm">
                              <AlertCircle size={12} /> Belum Ok
                            </span>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-3">
                            {!item.isVerified && (
                              <button
                                onClick={() => handleVerify(item)}
                                title="Verifikasi Data"
                                className="bg-emerald-600 text-white border border-emerald-400 hover:bg-emerald-500 p-2.5 rounded-xl transition-all shadow-lg active:scale-95"
                              >
                                <ShieldCheck size={20} />
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
}