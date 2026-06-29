# STEP 2 DAN STEP 3 — RELEASE SINGLE BARU

## Stack

```text
Frontend  : Next.js App Router
Backend   : Next.js Route Handlers
Database  : MySQL
Driver    : mysql2/promise
ORM       : Tidak menggunakan Prisma
Upload    : Chunk Upload
```

Dokumen ini merupakan lanjutan dari:

```text
STEP 1 — Audio & Track Detail
```

Alur release single:

```text
Step 1 — Audio & Track Detail
Step 2 — Cover Art & Track Distribution
Step 3 — Review Rilis
```

---

# STEP 2 — COVER ART & TRACK DISTRIBUTION

Step 2 terdiri dari dua bagian:

1. Cover Art
2. Track Distribution

User dapat menggunakan:

```text
Back
Save as Draft
Continue to Review
```

---

# 1. Cover Art

## 1.1 Upload Cover Art

Field:

```text
Cover Art *
```

Ketentuan wajib:

```text
Format       : JPG atau JPEG
Ekstensi     : .jpg atau .jpeg
Resolusi     : Tepat 3000 × 3000 px
Ukuran file  : Maksimal 5 MB
Aspect ratio : 1:1
Wajib        : Ya
```

Ekstensi harus diterima secara case-insensitive:

```text
.jpg
.JPG
.jpeg
.JPEG
```

Sistem sebaiknya menormalisasi ekstensi saat penyimpanan, misalnya menjadi:

```text
.jpg
```

## 1.2 Validasi Cover Art

Validasi tidak boleh hanya berdasarkan nama file.

Backend wajib memeriksa:

- Ekstensi file.
- MIME type.
- Signature atau magic bytes.
- Lebar gambar.
- Tinggi gambar.
- Aspect ratio.
- Ukuran file.
- File dapat dibaca.
- File bukan gambar rusak.
- File tidak mengandung format lain yang hanya diganti ekstensi.

MIME type yang diterima:

```text
image/jpeg
```

Validasi ukuran:

```text
width  = 3000
height = 3000
```

Validasi ukuran file:

```text
file_size <= 5 * 1024 * 1024
```

Pesan error:

```text
Cover Art wajib menggunakan format JPG atau JPEG.
Resolusi Cover Art harus tepat 3000 × 3000 piksel.
Ukuran Cover Art tidak boleh lebih dari 5 MB.
Cover Art harus memiliki rasio 1:1.
File gambar rusak atau tidak dapat dibaca.
```

## 1.3 Preview Cover Art

Setelah upload berhasil, tampilkan:

- Preview gambar.
- Nama file.
- Ukuran file.
- Resolusi.
- Format.
- Status validasi.
- Tombol ganti.
- Tombol hapus.

Contoh:

```text
cover-on-our-own.jpg
4.2 MB
3000 × 3000 px
JPEG
Valid
```

## 1.4 Metode Upload

Cover Art dapat menggunakan multipart upload biasa karena ukurannya maksimal 5 MB.

Endpoint:

```text
POST   /api/releases/[releaseId]/cover-art
DELETE /api/releases/[releaseId]/cover-art
```

Walaupun tidak wajib memakai chunk, backend tetap harus:

- Membatasi ukuran request.
- Menyimpan file di folder sementara.
- Memvalidasi gambar.
- Memindahkan file hanya setelah valid.
- Menghapus file sementara jika gagal.

Struktur folder:

```text
uploads/
└── releases/
    └── [releaseId]/
        └── cover/
            └── cover.jpg
```

Jangan menyimpan file di dalam folder `.next`.

---

# 2. Track Distribution

## 2.1 Status Rilis Sebelumnya

Field:

```text
Apakah rilis ini sudah pernah dirilis sebelumnya? *
```

Pilihan:

```text
Sudah Pernah Rilis
Belum Pernah Rilis
```

Kode penyimpanan yang disarankan:

```text
PREVIOUSLY_RELEASED
NOT_PREVIOUSLY_RELEASED
```

Atau menggunakan boolean:

```text
has_previous_release = 1
has_previous_release = 0
```

---

## 2.2 Jika Memilih Sudah Pernah Rilis

Tampilkan field:

1. Tanggal Rilis Sebelumnya
2. UPC
3. ISRC

### Tanggal Rilis Sebelumnya

```text
Field : Previous Release Date
Wajib : Ya
Jenis : Date
```

Validasi:

- Harus berupa tanggal valid.
- Tidak boleh berada di masa depan.
- Sebaiknya tidak lebih besar dari Tanggal Rilis baru.
- Harus disimpan dalam format MySQL `DATE`.

Contoh:

```text
2025-05-26
```

### UPC

```text
Field : UPC
Wajib : Ya
```

Validasi yang disarankan:

- Hanya angka.
- Panjang 12 atau 13 digit.
- Hapus spasi dan tanda hubung sebelum validasi.
- UPC tidak boleh digunakan oleh release lain secara tidak sah.
- Untuk re-release, pertahankan UPC lama jika metadata dan produknya memang sama.

Contoh:

```text
820233777278
```

### ISRC

```text
Field : ISRC
Wajib : Ya
```

Karena release single hanya memiliki satu track, Step 2 cukup memiliki satu ISRC.

Normalisasi:

- Ubah menjadi huruf besar.
- Hapus spasi.
- Hapus tanda hubung untuk penyimpanan internal jika diperlukan.
- Tampilkan kembali dalam format yang konsisten.

Contoh tampilan:

```text
IDABC2600001
```

Atau:

```text
ID-ABC-26-00001
```

Validasi pola dasar:

```text
2 karakter negara
3 karakter registrant
2 digit tahun
5 digit designation code
```

Regex internal tanpa tanda hubung:

```regex
^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$
```

Catatan:

- Sistem wajib memeriksa duplikasi ISRC.
- ISRC lama harus dipertahankan jika audio recording yang dirilis ulang memang sama.
- Jangan menghasilkan ISRC baru hanya karena release date berubah.

---

## 2.3 Jika Memilih Belum Pernah Rilis

Sembunyikan:

- Tanggal Rilis Sebelumnya
- UPC lama
- ISRC lama

Simpan:

```text
has_previous_release = 0
previous_release_date = NULL
previous_upc = NULL
previous_isrc = NULL
```

Untuk release baru:

- UPC dapat dibuat oleh sistem setelah release disetujui.
- ISRC dapat dibuat oleh sistem setelah release disetujui.
- Atau mengikuti kebijakan administrator yang berlaku.

---

# 3. Tanggal Rilis

Field:

```text
Release Date *
```

Jenis:

```text
Date
```

Aturan:

- Wajib diisi.
- Harus berupa tanggal valid.
- Tidak boleh lebih kecil dari tanggal hari ini untuk release baru.
- Harus mengikuti minimal lead time distribusi yang ditetapkan admin.
- Disimpan dalam format MySQL `DATE`.

Rekomendasi konfigurasi:

```text
MIN_RELEASE_LEAD_DAYS
```

Contoh:

```env
MIN_RELEASE_LEAD_DAYS=7
```

Validasi:

```text
release_date >= today + minimum_lead_days
```

Untuk release yang sudah pernah rilis, sistem dapat mengizinkan release date sesuai jadwal redistribusi, tetapi tetap tidak boleh berada di masa lalu jika release tersebut belum diproses.

Pesan error:

```text
Tanggal Rilis wajib diisi.
Tanggal Rilis tidak memenuhi batas minimal pengajuan.
Tanggal Rilis tidak boleh berada di masa lalu.
```

---

# 4. Tanggal Pra-Rilis Sosial Media & YouTube Music

Field:

```text
Social Media & YouTube Music Pre-Release Date
```

Jenis:

```text
Date
```

Aturan:

- Opsional, kecuali kebijakan bisnis mewajibkannya.
- Tidak boleh lebih besar atau sama dengan Tanggal Rilis.
- Tidak boleh berada di masa lalu saat form diajukan.
- Harus memiliki jarak minimal yang dapat dikonfigurasi.
- Disimpan dalam MySQL `DATE`.

Logika:

```text
pre_release_date < release_date
```

Rekomendasi:

```text
Tanggal Pra-Rilis minimal 1 hari sebelum Tanggal Rilis.
```

Pesan error:

```text
Tanggal Pra-Rilis harus sebelum Tanggal Rilis.
Tanggal Pra-Rilis tidak boleh berada di masa lalu.
```

Jika tanggal ini digunakan untuk pengiriman audio atau preview ke platform tertentu, tampilkan helper text:

```text
Tanggal ini digunakan untuk penjadwalan materi pra-rilis sosial media dan YouTube Music. Ketersediaan fitur mengikuti persetujuan serta dukungan platform.
```

---

# 5. Urutan Tampilan Step 2

```text
STEP 2 — COVER ART & TRACK DISTRIBUTION

A. Cover Art
   1. Upload Cover Art
   2. Preview
   3. Informasi File
   4. Status Validasi

B. Track Distribution
   1. Apakah Sudah Pernah Rilis?
   2. Tanggal Rilis Sebelumnya
   3. UPC
   4. ISRC
   5. Tanggal Rilis
   6. Tanggal Pra-Rilis Sosial Media & YouTube Music
```

Field nomor 2–4 hanya tampil jika:

```text
Sudah Pernah Rilis
```

---

# 6. Contoh Payload Step 2

## Sudah Pernah Rilis

```json
{
  "releaseId": 1001,
  "coverArtUploadId": "uuid-cover",
  "previousReleaseStatus": "PREVIOUSLY_RELEASED",
  "previousReleaseDate": "2025-05-26",
  "upc": "820233777278",
  "isrc": "IDABC2600001",
  "releaseDate": "2026-08-15",
  "preReleaseDate": "2026-08-08"
}
```

## Belum Pernah Rilis

```json
{
  "releaseId": 1002,
  "coverArtUploadId": "uuid-cover",
  "previousReleaseStatus": "NOT_PREVIOUSLY_RELEASED",
  "previousReleaseDate": null,
  "upc": null,
  "isrc": null,
  "releaseDate": "2026-08-15",
  "preReleaseDate": "2026-08-08"
}
```

---

# 7. Validasi Zod Step 2

```ts
import { z } from "zod";

const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;
const upcRegex = /^[0-9]{12,13}$/;

export const singleReleaseStepTwoSchema = z
  .object({
    coverArtUploadId: z.string().uuid(),

    previousReleaseStatus: z.enum([
      "PREVIOUSLY_RELEASED",
      "NOT_PREVIOUSLY_RELEASED",
    ]),

    previousReleaseDate: z
      .string()
      .date()
      .nullable(),

    upc: z
      .string()
      .regex(upcRegex, "UPC harus terdiri dari 12 atau 13 angka.")
      .nullable(),

    isrc: z
      .string()
      .transform((value) =>
        value.replace(/[\s-]/g, "").toUpperCase()
      )
      .refine(
        (value) => isrcRegex.test(value),
        "Format ISRC tidak valid."
      )
      .nullable(),

    releaseDate: z.string().date(),

    preReleaseDate: z
      .string()
      .date()
      .nullable(),
  })
  .superRefine((data, context) => {
    if (
      data.previousReleaseStatus === "PREVIOUSLY_RELEASED"
    ) {
      if (!data.previousReleaseDate) {
        context.addIssue({
          code: "custom",
          path: ["previousReleaseDate"],
          message: "Tanggal Rilis Sebelumnya wajib diisi.",
        });
      }

      if (!data.upc) {
        context.addIssue({
          code: "custom",
          path: ["upc"],
          message: "UPC wajib diisi.",
        });
      }

      if (!data.isrc) {
        context.addIssue({
          code: "custom",
          path: ["isrc"],
          message: "ISRC wajib diisi.",
        });
      }
    }

    if (
      data.preReleaseDate &&
      data.preReleaseDate >= data.releaseDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["preReleaseDate"],
        message:
          "Tanggal Pra-Rilis harus sebelum Tanggal Rilis.",
      });
    }
  });
```

Validasi tanggal terhadap tanggal server harus dilakukan di backend, bukan hanya mengandalkan browser.

---

# 8. Struktur Database Step 2

Tambahkan atau sesuaikan tabel `releases`.

Contoh field:

```text
cover_art_path
cover_art_original_name
cover_art_mime_type
cover_art_size
cover_art_width
cover_art_height

has_previous_release
previous_release_date
upc
isrc

release_date
pre_release_date
current_step
```

Contoh SQL:

```sql
ALTER TABLE releases
  ADD COLUMN cover_art_path TEXT NULL,
  ADD COLUMN cover_art_original_name VARCHAR(255) NULL,
  ADD COLUMN cover_art_mime_type VARCHAR(100) NULL,
  ADD COLUMN cover_art_size BIGINT UNSIGNED NULL,
  ADD COLUMN cover_art_width INT UNSIGNED NULL,
  ADD COLUMN cover_art_height INT UNSIGNED NULL,

  ADD COLUMN has_previous_release TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN previous_release_date DATE NULL,
  ADD COLUMN upc VARCHAR(13) NULL,
  ADD COLUMN isrc VARCHAR(12) NULL,

  ADD COLUMN release_date DATE NULL,
  ADD COLUMN pre_release_date DATE NULL;
```

Tambahkan index:

```sql
ALTER TABLE releases
  ADD INDEX idx_releases_release_date (release_date),
  ADD INDEX idx_releases_previous_release (
    has_previous_release,
    previous_release_date
  ),
  ADD INDEX idx_releases_upc (upc),
  ADD INDEX idx_releases_isrc (isrc);
```

Gunakan unique index hanya jika kebijakan katalog memang mengharuskan satu UPC dan satu ISRC tidak boleh muncul pada beberapa record internal.

Untuk katalog re-release, satu ISRC dapat secara sah muncul pada lebih dari satu produk. Karena itu, validasi duplikasi sebaiknya mempertimbangkan recording dan kepemilikan, bukan hanya unique constraint sederhana.

---

# 9. Penyimpanan Step 2

Gunakan transaction:

```text
BEGIN TRANSACTION

1. Validasi kepemilikan release.
2. Validasi Cover Art.
3. Pindahkan Cover Art dari temporary storage.
4. Update metadata Cover Art.
5. Update previous release status.
6. Update previous release date.
7. Update UPC.
8. Update ISRC.
9. Update Release Date.
10. Update Pre-Release Date.
11. Update current_step = 3.

COMMIT
```

Jika gagal:

```text
ROLLBACK
```

File Cover Art yang sudah dipindahkan harus dibersihkan atau dikembalikan bila transaksi database gagal.

---

# STEP 3 — REVIEW RILIS

## 10. Tujuan

Step 3 menampilkan seluruh data yang sudah dimasukkan pada Step 1 dan Step 2 sebelum release dikirim untuk review admin.

Tidak ada field utama yang diedit langsung pada Step 3.

Setiap bagian memiliki tombol:

```text
Edit
```

Tombol Edit mengarahkan user ke Step terkait.

---

# 11. Struktur Review

## 11.1 Release Summary

Tampilkan:

- Jenis Release: Single
- Judul Track / Release
- Versi Rilis
- Genre
- Subgenre
- Instrumental
- Record Label
- Status draft

Contoh:

```text
Release Type    : Single
Release Title   : On Our Own
Release Version : Original
Genre           : Rock
Subgenre        : Pop Rock
Instrumental    : No
Record Label    : MSV Records
```

---

## 11.2 Audio Files

Tampilkan File Master:

- Nama file
- Format
- Ukuran
- Durasi
- Sample rate
- Bit depth
- Status validasi

Tampilkan File Sosmed:

- Nama file
- Format
- Ukuran
- Durasi
- Sample rate
- Bit depth
- Status validasi

Sediakan audio player preview untuk kedua file.

Jangan menyediakan trim atau edit audio.

---

## 11.3 Cover Art

Tampilkan:

- Preview Cover Art
- Nama file
- Ukuran
- Resolusi
- Format
- Status validasi

Ukuran preview UI dapat lebih kecil, tetapi file asli tetap 3000 × 3000 px.

---

## 11.4 Lyrics Information

Jika Instrumental = No, tampilkan:

- Bahasa Lirik
- Explicit
- Lirik

Jika Instrumental = Yes, tampilkan:

```text
Instrumental Track
```

Jangan menampilkan field lirik kosong.

---

## 11.5 Artist

Tampilkan:

### Primary Artist

- Nama
- Urutan

### Featured Artist

- Nama
- Urutan

Jika tidak ada Featured Artist, tampilkan:

```text
Tidak ada Featured Artist
```

---

## 11.6 Contributors

Tampilkan semua contributor:

```text
Role — Name
```

Contoh:

```text
Drums — Wahyu Piaji
Bass Guitar — Rai Dinata
Guitar — Nurul Damar Ramadhan
```

Jika kosong:

```text
Tidak ada Contributor tambahan
```

---

## 11.7 Production & Additional Production

Tampilkan:

```text
Role — Name
```

Contoh:

```text
Producer — Ryan Benyo
Mixing Engineer — Mark Needham
Mastering Engineer — Howie Weinberg
Studio — Clear Lake Studio Burbank
```

---

## 11.8 Songwriter / Composer

Tampilkan seluruh nama dan urutannya.

Contoh:

```text
1. Rian Ekky Pradipta
2. Zethi
```

---

## 11.9 Lyricists

Tampilkan seluruh nama lyricist.

Jika Instrumental = Yes:

```text
Tidak berlaku untuk track instrumental
```

---

## 11.10 Additional Writers

Tampilkan:

```text
Role — Name
```

Contoh:

```text
Arranger — D'MASIV
Publisher — Soundfresh.ID
```

Jika kosong:

```text
Tidak ada Additional Writer
```

---

## 11.11 Distribution Information

Tampilkan:

- Status pernah rilis sebelumnya
- Tanggal Rilis Sebelumnya
- UPC
- ISRC
- Tanggal Rilis
- Tanggal Pra-Rilis Sosial Media & YouTube Music

Jika belum pernah rilis:

```text
Previous Release : Belum Pernah Rilis
UPC              : Akan dibuat atau ditentukan setelah persetujuan
ISRC             : Akan dibuat atau ditentukan setelah persetujuan
```

---

# 12. Pemeriksaan Otomatis Sebelum Submit

Sebelum tombol Submit aktif, backend menjalankan final validation.

## Step 1

- File Master valid.
- File Sosmed valid.
- File Sosmed 30–60 detik.
- Judul tersedia.
- Versi Rilis tersedia.
- Genre dan Subgenre valid.
- Instrumental sudah dipilih.
- Data lirik lengkap jika non-instrumental.
- Primary Artist minimal satu.
- Songwriter / Composer minimal satu.
- Semua role credit valid.

## Step 2

- Cover Art valid.
- Cover Art tepat 3000 × 3000 px.
- Cover Art maksimal 5 MB.
- Previous release status valid.
- Previous date, UPC, dan ISRC lengkap jika pernah rilis.
- Release Date valid.
- Pre-Release Date lebih kecil dari Release Date.
- Record Label valid jika diwajibkan.

## Kepemilikan

- Release dimiliki user.
- Upload dimiliki user.
- Artist dapat digunakan user.
- Record Label dapat digunakan user.
- Tidak ada file temporary yang belum selesai.
- Tidak ada perubahan data setelah final validation dimulai.

---

# 13. Pernyataan Konfirmasi

Sebelum Submit, tampilkan checkbox:

```text
Saya menyatakan bahwa seluruh metadata, audio, Cover Art,
hak cipta, hak distribusi, informasi artis, penulis, dan
kontributor yang saya kirim adalah benar serta telah memiliki
izin yang diperlukan.
```

Checkbox wajib dicentang.

Tambahkan checkbox kedua:

```text
Saya telah memeriksa kembali seluruh data rilisan dan memahami
bahwa perubahan setelah diajukan dapat memerlukan persetujuan admin.
```

---

# 14. Tombol Step 3

```text
Back
Save as Draft
Submit Release
```

## Back

Kembali ke Step 2.

## Save as Draft

Tetap menyimpan release sebagai:

```text
DRAFT
```

## Submit Release

Setelah final validation berhasil:

```text
status = SUBMITTED
current_step = 3
submitted_at = NOW()
```

Setelah submit:

- Form dikunci untuk user.
- User diarahkan ke halaman detail release.
- Tampilkan nomor release atau kode registrasi.
- Kirim notifikasi kepada admin.
- Kirim notifikasi atau email kepada user.
- Catat activity log.
- Admin dapat mengubah status menjadi Review.

---

# 15. Status Workflow

Rekomendasi:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
REVISION_REQUIRED
APPROVED
PROCESSING
DELIVERED
RELEASED
REJECTED
TAKEDOWN
```

Alur awal:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
```

Jika perlu perbaikan:

```text
UNDER_REVIEW
  ↓
REVISION_REQUIRED
  ↓
DRAFT atau RESUBMITTED
```

---

# 16. API Step 2 dan Step 3

```text
GET   /api/releases/[releaseId]/step-2
PUT   /api/releases/[releaseId]/step-2

GET   /api/releases/[releaseId]/review
POST  /api/releases/[releaseId]/validate
POST  /api/releases/[releaseId]/submit
```

Cover Art:

```text
POST   /api/releases/[releaseId]/cover-art
DELETE /api/releases/[releaseId]/cover-art
```

---

# 17. Response Review API

Contoh:

```json
{
  "success": true,
  "data": {
    "release": {
      "id": 1001,
      "type": "SINGLE",
      "title": "On Our Own",
      "version": "Original",
      "genre": "Rock",
      "subgenre": "Pop Rock",
      "instrumental": false,
      "recordLabel": "MSV Records"
    },
    "audio": {
      "master": {
        "fileName": "on-our-own.wav",
        "duration": 224.5,
        "sampleRate": 44100,
        "bitDepth": 24,
        "status": "VALID"
      },
      "socialMedia": {
        "fileName": "on-our-own-social.wav",
        "duration": 45,
        "sampleRate": 44100,
        "bitDepth": 24,
        "status": "VALID"
      }
    },
    "coverArt": {
      "fileName": "cover.jpg",
      "width": 3000,
      "height": 3000,
      "fileSize": 4200000,
      "status": "VALID"
    },
    "distribution": {
      "previouslyReleased": true,
      "previousReleaseDate": "2025-05-26",
      "upc": "820233777278",
      "isrc": "IDABC2600001",
      "releaseDate": "2026-08-15",
      "preReleaseDate": "2026-08-08"
    }
  }
}
```

---

# 18. Transaction Submit Release

Gunakan transaction dan row lock.

```text
BEGIN TRANSACTION

1. SELECT release FOR UPDATE.
2. Pastikan status masih DRAFT atau REVISION_REQUIRED.
3. Jalankan final validation.
4. Simpan acceptance checkbox.
5. Update status menjadi SUBMITTED.
6. Simpan submitted_at.
7. Buat activity log.
8. Buat notification admin.
9. Buat notification user.

COMMIT
```

Jika ada kegagalan:

```text
ROLLBACK
```

Untuk email, lebih baik masukkan pekerjaan ke queue setelah commit agar transaksi database tidak menunggu SMTP.

---

# 19. Struktur UI Step 3

Gunakan card:

```text
[ Release Summary ]                  [ Edit Step 1 ]
[ Audio Files ]                      [ Edit Step 1 ]
[ Track & Lyrics ]                   [ Edit Step 1 ]
[ Artists & Credits ]                [ Edit Step 1 ]
[ Cover Art ]                        [ Edit Step 2 ]
[ Distribution Information ]         [ Edit Step 2 ]
[ Confirmation ]
[ Submit Release ]
```

Pada desktop:

- Gunakan dua kolom untuk summary.
- Cover Art berada di samping metadata utama.
- Credits dapat menggunakan tabel.

Pada mobile:

- Semua card menjadi satu kolom.
- Tombol Edit tetap terlihat.
- Audio player menggunakan lebar penuh.
- Tabel credits berubah menjadi list.

---

# 20. Checklist Step 2

## Cover Art

- [ ] JPG atau JPEG.
- [ ] Ekstensi case-insensitive.
- [ ] MIME `image/jpeg`.
- [ ] Tepat 3000 × 3000 px.
- [ ] Maksimal 5 MB.
- [ ] Preview tersedia.
- [ ] File rusak ditolak.
- [ ] File sementara dibersihkan.

## Distribution

- [ ] Status pernah rilis.
- [ ] Previous Release Date kondisional.
- [ ] UPC kondisional.
- [ ] ISRC kondisional.
- [ ] Release Date.
- [ ] Pre-Release Date.
- [ ] Validasi relasi tanggal.
- [ ] Validasi duplikasi UPC dan ISRC secara kontekstual.

---

# 21. Checklist Step 3

- [ ] Semua input Step 1 tampil.
- [ ] Semua input Step 2 tampil.
- [ ] Audio dapat dipreview.
- [ ] Cover Art dapat dipreview.
- [ ] Tidak ada field edit langsung.
- [ ] Tombol Edit menuju Step terkait.
- [ ] Final validation dari server.
- [ ] Checkbox pernyataan wajib.
- [ ] Submit menggunakan transaction.
- [ ] Release dikunci setelah submit.
- [ ] Activity log dibuat.
- [ ] Notification dibuat.
- [ ] Status berubah menjadi SUBMITTED.
- [ ] Tidak menggunakan Prisma.
- [ ] Semua query memakai `mysql2/promise`.
