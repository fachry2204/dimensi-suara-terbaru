# Migrasi Vue + Laravel (tahap awal)

CMS Next.js lama masih berada di direktori utama dan **belum diganti di produksi**. Salinan lengkap sebelumnya berada di `D:\xampp\htdocs\dimensisuaracmsbaru\CMSLAMA`. Backend baru ada di `backend-laravel/`, frontend baru di `frontend-vue/`.

## Menjalankan lokal

Persyaratan lingkungan ini: PHP 8.2 (Laravel 12), MySQL XAMPP yang sudah memuat database `dimensisuara`, Node.js, dan dependensi Composer/npm yang terpasang.

Terminal 1, dari `backend-laravel/`:

```powershell
& .\serve-local.ps1
```

Terminal 2, dari `frontend-vue/`:

```powershell
npm.cmd run dev
```

Buka alamat yang ditampilkan Vite (biasanya `http://127.0.0.1:5174`). Skrip lokal memakai router absolut dan menaikkan batas upload PHP menjadi 200 MB khusus proses ini; `artisan serve` dengan path router relatif bermasalah di mesin ini. Jangan menjalankan `artisan migrate` atau `composer run setup` pada database CMS lama.

## Sudah berfungsi di implementasi baru

- Login dan logout dengan akun MySQL lama (hash bcrypt), sesi HttpOnly dan CSRF; pembatasan status akun.
- Landing page publik di `/` dengan navigasi ke login, pendaftaran, layanan, rilis, dan royalti.
- Pendaftaran Personal/Perusahaan, upload dokumen ke `uploads/profiles/` agar terbaca pula di CMS lama, cek duplikat, dan status Pending.
- Dashboard ringkas, daftar rilis milik user / seluruh rilis bagi admin, detail tracklist, serta daftar pengguna untuk admin/operator.
- Pembuatan dan penyuntingan draft Single/Album dengan pencarian pemilik rilis untuk admin, metadata rilis/track, beberapa track, dan upload cover/audio; cover dapat dipratinjau/diunduh dan audio dapat diputar/diunduh lewat endpoint berbatas akses.
- Pengiriman draft ke status `Pending` untuk review. User wajib melengkapi cover, metadata, audio master, dan clip; admin dapat mengirim tanpa audio serta boleh memilih tanggal rilis lampau maupun mendatang.
- Workflow review admin memakai status kompatibel CMS lama (`Pending`, `Request Edit`, `Processing`, `Live`, `Rejected`). Status Live memerlukan UPC dan ISRC seluruh track; catatan revisi/penolakan ditampilkan kepada pemilik rilis.
- Form rilis memakai master genre/subgenre aktif, daftar bahasa/versi, label milik user, dan saran artis dari katalog user. Admin memperoleh data tersebut berdasarkan user pemilik yang dipilih; pasangan ID/nama divalidasi kembali oleh backend.
- Pendaftaran Indonesia memakai pilihan wilayah berjenjang dan pencarian kode pos otomatis melalui proxy Laravel dengan cache. Jika kode pos tidak ditemukan, user dapat mengisinya manual; backend mewajibkan seluruh wilayah dan format kode pos untuk alamat Indonesia.
- Pengelolaan akun dipisah menjadi tab User dan Admin/Operator. Detail user mencakup profil, dokumen berbatas akses, persentase, serta workflow persetujuan/penolakan/pemblokiran khusus admin; detail akun staf hanya menampilkan identitas dasar tanpa hash password.
- Admin dapat membuat akun Admin/Operator melalui form khusus berisi role, nama, email, dan password, serta mereset password staf. Operator tidak memiliki izin untuk aksi tersebut.
- Endpoint dokumen dengan pemeriksaan hak akses dan mode preview/download.
- Kontrak digital: admin dapat generate DOCX langsung dari template aktif tanpa mengubah layout, mengirim tautan penandatanganan berumur 7 hari, memantau status, serta mengunduh dokumen. User memiliki menu kontrak sendiri dan halaman tanda tangan publik menyimpan bukti persetujuan, identitas, waktu, IP, user-agent, gambar tanda tangan, dan checksum kontrak.
- Report dan royalti: admin dapat mengunggah XLSX/XLS/CSV berdasarkan periode bulan-tahun, mereview hasil deteksi pemilik lagu berdasarkan UPC/ISRC, mengecek ulang katalog, mengisi kurs, dan memfinalisasi baris yang cocok ke ledger royalti. User hanya dapat melihat analitik ringkas dan rincian royalti miliknya sendiri.
- Pengiriman kontrak mencatat status Email/WhatsApp secara jujur. Email memakai konfigurasi mail Laravel (mode `log` dicatat sebagai `LOGGED`); WhatsApp baru dikirim jika `WHATSAPP_API_URL` dan `WHATSAPP_API_TOKEN` dikonfigurasi, selain itu berstatus `NOT_CONFIGURED` dan admin tetap memperoleh tautan untuk disalin.
- Pengujian backend untuk akses tanpa sesi, pembatasan pemilik rilis, dan perlindungan daftar pengguna; build frontend Vue.

## Belum dipindahkan — jangan lakukan cutover

Pengiriman notifikasi review, pengelolaan master label/artis lanjutan, pembayaran/penarikan royalti, integrasi SoundOn, konfigurasi provider Email/WhatsApp produksi, dan modul lainnya masih menggunakan aplikasi Next.js atau belum selesai dipindahkan. Validasi bisnis pendaftaran lainnya masih perlu dibandingkan menyeluruh dengan aplikasi lama. Belum ada pengujian end-to-end pendaftaran atau rilis dengan data riil maupun deployment domain. Pindahkan tiap modul berikutnya setelah kesetaraan data, izin akses, dan pengujian alur selesai; jangan mengarahkan `dimensisuara.id` ke sistem baru sebelum itu.

## Pemeriksaan

```powershell
cd backend-laravel
& D:\xampp\php\php.exe artisan test
cd ..\frontend-vue
npm.cmd run build
```

Konfigurasi lokal Laravel berada di `.env` yang diabaikan Git; jangan memasukkan kata sandi produksi ke repo. Jika konfigurasi database server berbeda, sesuaikan `.env` secara lokal.
