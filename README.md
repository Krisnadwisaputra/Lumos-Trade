# EMA + Smart Money Concepts Auto Trading Platform

Platform trading otomatis yang menggabungkan teknik EMA (Exponential Moving Average) dengan Smart Money Concepts (SMC) untuk membuat strategi trading yang lebih efektif. Platform ini memungkinkan pengguna untuk mengonfigurasi bot trading, melihat analisis pasar real-time, dan melacak kinerja perdagangan.

## Fitur Utama

- **Otentikasi dengan Firebase**: Login cepat dan aman menggunakan Google atau email/password
- **Visualisasi Chart**: Chart interaktif dengan indikator EMA dan Smart Money Concepts
- **Panel Trading**: Kemampuan untuk melaksanakan order market dan limit
- **Tracking Otomatis**: Pencatatan dan analisis semua transaksi trading
- **Konfigurasi Bot**: Pengaturan strategi trading otomatis dengan parameter yang dapat disesuaikan
- **Integrasi Exchange**: Terhubung langsung ke Binance dengan mode simulasi sebagai fallback
- **Metrik Performa**: Analisis visual kinerja strategi trading yang komprehensif

## Memulai Aplikasi

1. Pastikan Anda memiliki Binance API key dan secret (opsional jika menggunakan mode simulasi)
2. Pastikan semua environment variables sudah diatur:
   - `BINANCE_API_KEY` dan `BINANCE_API_SECRET` - untuk koneksi ke Binance API
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, dll - untuk Firebase Auth

3. Menjalankan server:
   ```bash
   python app.py
   ```

4. Mengakses aplikasi:
   Buka browser dan kunjungi URL yang ditampilkan di console (biasanya http://localhost:5000)

## Penggunaan

1. Login menggunakan akun Google atau email/password
2. Pilih pasangan aset untuk trading (misalnya BTC/USDT)
3. Konfigurasikan parameter trading seperti ukuran posisi, stop loss, dan take profit
4. Gunakan panel trading manual untuk membuat order atau aktifkan bot trading otomatis
5. Pantau kinerja dan analisis perdagangan melalui dashboard

## Mode Simulasi

Jika API key Binance tidak tersedia atau terdapat batasan geografis, sistem akan berjalan dalam mode simulasi yang memberikan pengalaman trading realistis tanpa menggunakan dana sungguhan.

## Catatan Teknis

- Frontend: React + TypeScript dengan Tailwind CSS dan ShadCN UI
- Backend: Flask (Python) dengan CCXT untuk integrasi exchange
- Database: Firebase untuk autentikasi dan penyimpanan data
- Visualisasi: Lightweight Charts untuk chart trading dan Chart.js untuk analitik