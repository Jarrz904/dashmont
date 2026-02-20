# 🚀 Monitoring System Dashboard (Real-time Analytics)

Sistem Dashboard Monitoring modern yang dirancang untuk mengelola, memverifikasi, dan memvisualisasikan data pengajuan layanan publik secara real-time. Dibangun dengan **Next.js**, **Tailwind CSS**, dan **Supabase** untuk performa tinggi dan antarmuka yang intuitif.

---

## 📸 Preview Antarmuka
- **High-Contrast Dark Mode**: Desain futuristik dengan tema gelap yang nyaman di mata.
- **Visualisasi Data**: Grafik batang dan lingkaran (Donut Chart) yang interaktif menggunakan Recharts.
- **Tabel Rekapitulasi**: Ringkasan status verifikasi yang bersih dan mudah dibaca.

---

## 🛠️ Fitur Utama

### 1. Dashboard Analitik
* **Total Pengajuan Kontra**: Menampilkan jumlah total ajuan secara akumulatif.
* **Grafik Kelompok Data**: Visualisasi jumlah ajuan per kategori untuk melihat tren distribusi data.
* **Real-time Clock & Calendar**: Monitoring waktu presisi di header dashboard.
* **Status Si Pandu**: Indikator status sistem online dalam bentuk chart lingkaran.

### 2. Manajemen Data (CRUD)
* **Tambah Data**: Form input dinamis untuk menambah ajuan baru berdasarkan kategori dan jenis layanan.
* **Update Data**: Kemampuan untuk menyunting data yang salah input dengan mode pengeditan yang responsif.
* **Hapus Data**: Fitur penghapusan dengan modal konfirmasi keamanan.

### 3. Sistem Verifikasi
* **Verifikasi Satu Klik**: Admin dapat memvalidasi data yang masuk secara langsung.
* **Indikator Status**: Label visual yang jelas antara data yang "Terverifikasi" dan "Belum Ok".
* **Rekapitulasi Layanan**: Tabel khusus yang merangkum perbandingan jumlah data yang sudah vs belum diverifikasi per jenis layanan.

### 4. User Experience (UX)
* **Toast Notifications**: Notifikasi pop-up yang muncul saat berhasil/gagal melakukan aksi.
* **Modal Dialog**: Konfirmasi untuk tindakan krusial (hapus/verifikasi) guna mencegah kesalahan user.
* **Responsive Design**: Layout yang adaptif untuk berbagai ukuran layar (Desktop & Mobile).

---

## 🏗️ Teknologi yang Digunakan

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS |
| **Database & Auth** | Supabase |
| **Icons** | Lucide React |
| **Charts** | Recharts |
| **Animation** | Tailwind Animate & Framer Motion (optional) |

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

1.  **Clone Repositori**
    ```bash
    git clone [https://github.com/Jarrz904/Dashboard_Monitoring.git](https://github.com/Jarrz904/Dashboard_Monitoring.git)
    cd Dashboard_Monitoring
    ```

2.  **Instal Dependensi**
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variable**
    Buat file `.env.local` di root folder dan isi dengan kredensial Supabase Anda:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```

4.  **Jalankan Server Development**
    ```bash
    npm run dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📊 Struktur Database (Supabase)

Proyek ini menggunakan 3 tabel utama:
1.  **kelompok_data**: Menyimpan kategori utama (Contoh: Pendaftaran Penduduk, Pencatatan Sipil).
2.  **jenis_data**: Menyimpan sub-layanan yang terikat pada kelompok data.
3.  **isi_data**: Tabel transaksi yang menyimpan jumlah ajuan, tanggal, jam, dan status verifikasi.

---

## 🤝 Kontribusi

Kontribusi selalu terbuka! Jika Anda memiliki saran atau ingin meningkatkan fitur, silakan buat *Pull Request* atau buka *Issue*.

---

Disusun dengan ❤️ oleh [Jarrz904](https://github.com/Jarrz904)