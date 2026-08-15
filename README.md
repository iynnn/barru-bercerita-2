# 📊 Barru Bercerita v2

> Portal Visualisasi Data Indikator Makro & Sistem Manajemen Jadwal Jaga PST BPS Kabupaten Barru.

`Barru Bercerita 2` adalah aplikasi web publik dan portal internal BPS Kabupaten Barru untuk menyajikan data statistik daerah (PDRB, Kemiskinan, Ketenagakerjaan, IPM, dll.), analisis naratif otomatis berbasis AI, serta pengelolaan jadwal piket dan presensi petugas Pelayanan Statistik Terpadu (PST).

---

## ✨ Fitur Utama

- **Dashboard Data Statistik**: Visualisasi tren deret waktu (series) indikator makro dengan Chart.js, ekspor grafik, dan komparasi variabel.
- **Barru Bercerita (AI Insight)**: Penulisan narasi statistik dan rekomendasi kebijakan otomatis menggunakan Google Gemini AI.
- **Sinkronisasi Web API BPS**: Ambil dan update variabel data statistik terbaru secara otomatis dari Web API BPS.
- **Jadwal Jaga & Presensi PST**: 
  - Penjadwalan piket otomatis (rotasi tim PST K1, K2, P, dan R).
  - Presensi *check-in* harian petugas layanan.
  - Alur tukar jadwal piket mandiri (*Shift Swap*) 1-step direct ACC.
  - Impor & ekspor daftar petugas via Excel (`.xlsx` / `.csv`).
- **Portal Layanan PST**: Katalog layanan publik terpadu BPS Barru.

---

## 🛠️ Teknologi yang Digunakan

### Frontend
- **Framework**: React 19 + Vite 8
- **Routing**: React Router (`HashRouter`)
- **Styling**: Vanilla CSS (Modern Glassmorphic UI & Dark Mode)
- **Visualisasi & Ikon**: Chart.js, `react-chartjs-2`, Lucide React
- **Spreadsheet Parser**: SheetJS (`xlsx`)

### Backend
- **Core API**: PHP Native (Vanilla REST API)
- **Database**: MySQL (PDO with Fallback Engine)
- **Integrasi Eksternal**: Web API BPS (`BpsClient`), Google Gemini API (`gemini-2.0-flash`)

---

## 🚀 Panduan Instalasi Lokal

### Prasyarat
- Node.js >= 18
- Web Server Lokal (MAMP / XAMPP / Laragon) dengan PHP >= 8.0 dan MySQL.

### Langkah-langkah
1. **Clone repository**:
   ```bash
   git clone https://github.com/iynnn/barru-bercerita-2.git
   cd barru-bercerita-2
   ```

2. **Install dependencies frontend**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment (`.env`)**:
   Salin `.env.example` menjadi `.env` di root folder project:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan parameter database & API key Anda:
   ```ini
   DB_HOST=127.0.0.1
   DB_PORT=8889
   DB_DATABASE=barru_bercerita_2
   DB_USERNAME=root
   DB_PASSWORD=root

   BPS_API_KEY=6f2b04253bc3c59d762755e3f322f550
   BPS_DOMAIN=7310
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Import Database**:
   Import file SQL `barru_bercerita_2.sql` ke MySQL Anda via phpMyAdmin atau MySQL CLI.

5. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Akses di browser: `http://localhost:5173`

---

## 🌐 Panduan Deployment ke cPanel (Subfolder)

Jika Anda menempatkan aplikasi pada subfolder domain (contoh: `https://barru.stat7300.net/barru_bercerita/`):

1. Build bundle produksi di lokal:
   ```bash
   npm run build
   ```
2. Upload file berikut ke folder target cPanel (`public_html/barru_bercerita/`):
   ```
   public_html/barru_bercerita/
   ├── assets/          # Dari folder dist/assets/
   ├── api/             # Seluruh isi folder api/
   ├── index.html       # Dari dist/index.html
   ├── logo_pst.png     # Dari dist/logo_pst.png
   ├── .htaccess        # File .htaccess root project
   └── .env             # Buat baru sesuai DB cPanel
   ```
3. Sesuaikan `.env` cPanel (port default MySQL cPanel biasanya `3306` dan `DB_HOST=localhost`).

---

## 📂 Struktur Direktori

```
barru-bercerita-2/
├── api/                  # Backend PHP REST API
│   ├── data/             # Cache JSON & fallback data
│   ├── .htaccess         # Konfigurasi rewrite folder API
│   ├── config.php        # Koneksi database PDO & helper
│   ├── dashboard.php     # Endpoint indikator & AI insight
│   ├── pst.php           # Endpoint manajemen layanan PST
│   ├── schedule.php      # Endpoint jadwal, presensi & tukar piket
│   └── sync.php          # Endpoint sinkronisasi Web API BPS
├── public/               # Aset statis public (logo PST, dll.)
├── src/
│   ├── api.js            # Axios client & handler API relative
│   ├── components/       # Komponen UI reusable & Sidebar
│   ├── views/            # Halaman (Dashboard, PST, Schedule, Login, etc.)
│   ├── App.jsx           # Routing utama (HashRouter)
│   └── main.jsx          # Entry point React
├── .env.example          # Template konfigurasi environment
├── .htaccess             # Apache SPA rewrite config
└── vite.config.js        # Konfigurasi Vite build (base relative './')
```

---

## 👤 Lisensi & Hak Cipta

Dikembangkan untuk **Badan Pusat Statistik (BPS) Kabupaten Barru**.  
Hak Cipta © 2026 BPS Kabupaten Barru.

