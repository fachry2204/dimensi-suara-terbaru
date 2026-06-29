# STEP 1 — RELEASE SINGLE BARU

## Stack

```text
Frontend  : Next.js App Router
Backend   : Next.js Route Handlers
Database  : MySQL
Driver    : mysql2/promise
ORM       : Tidak menggunakan Prisma
Upload    : Chunk Upload
```

Step 1 terdiri dari:

1. Audio File
2. Track Detail
3. Artist
4. Contributor
5. Production & Additional Production
6. Songwriter / Composer
7. Lyricists
8. Additional Writers
9. Record Label

User dapat menggunakan **Save as Draft** untuk menyimpan data belum lengkap. Tombol **Continue** hanya aktif setelah seluruh field wajib valid.

---

# 1. Audio File

User wajib mengunggah dua file audio terpisah.

## 1.1 File Master

```text
Field             : Master Audio File
Wajib             : Ya
Format            : WAV atau FLAC
Bit depth minimum : 16-bit
Upload            : Chunk upload
Trim              : Tidak tersedia
Pemotongan audio  : Tidak tersedia
```

Setelah upload, tampilkan:

- Nama file
- Ukuran file
- Format
- Durasi
- Sample rate
- Bit depth
- Progress upload
- Status validasi

## 1.2 File Potongan Sosmed

```text
Field             : Social Media Audio 30–60 Seconds
Wajib             : Ya
Durasi            : 30–60 detik
Format            : WAV atau FLAC
Bit depth minimum : 16-bit
Upload            : Chunk upload
Trim              : Tidak tersedia
Pemotongan audio  : Tidak tersedia
```

User harus menyiapkan sendiri file potongan sosial media. Sistem tidak memotong file master dan tidak menyediakan pemilihan bagian lagu.

## 1.3 Validasi Audio

Validasi menggunakan `ffprobe` setelah seluruh chunk selesai digabungkan.

Validasi wajib:

- File hanya WAV atau FLAC.
- MIME type sesuai.
- Audio dapat dibaca.
- Bit depth minimal 16-bit.
- File tidak kosong atau rusak.
- File Sosmed minimal 30 detik.
- File Sosmed maksimal 60 detik.
- Seluruh chunk berhasil diterima.
- Checksum file akhir sesuai.

Pesan error:

```text
Format audio harus WAV atau FLAC.
Bit depth audio minimal 16-bit.
Durasi file sosial media harus antara 30 hingga 60 detik.
Upload belum selesai.
File audio rusak atau tidak dapat dibaca.
```

## 1.4 Endpoint Chunk Upload

```text
POST   /api/uploads/init
POST   /api/uploads/[uploadId]/chunk
GET    /api/uploads/[uploadId]/status
POST   /api/uploads/[uploadId]/complete
DELETE /api/uploads/[uploadId]
```

Masing-masing file mempunyai upload session sendiri:

```text
MASTER_AUDIO
SOCIAL_MEDIA_AUDIO
```

Contoh init upload:

```json
{
  "releaseType": "SINGLE",
  "filePurpose": "MASTER_AUDIO",
  "fileName": "judul-lagu.wav",
  "fileSize": 125000000,
  "mimeType": "audio/wav",
  "totalChunks": 25
}
```

Aturan teknis:

- Upload dapat dilanjutkan setelah koneksi terputus.
- Progress kedua file ditampilkan terpisah.
- Jangan membaca seluruh file ke memory.
- Jangan menggunakan satu request multipart besar.
- File belum valid sebelum endpoint `complete` berhasil.
- User dapat menghapus dan mengganti file sebelum melanjutkan.

---

# 2. Track Detail

## 2.1 Judul Track / Release

```text
Field : Track / Release Title
Wajib : Ya
```

Untuk Single, judul track sekaligus menjadi judul release.

Validasi:

- Tidak boleh kosong.
- Tidak boleh hanya spasi.
- Maksimal 255 karakter.
- Judul release dan track harus konsisten.

## 2.2 Versi Rilis

```text
Field : Release Version
Wajib : Ya
```

Pilihan yang disarankan:

```text
Original
Acoustic
Live
Remix
Radio Edit
Instrumental
Remastered
Demo
Other
```

Jika memilih `Other`, tampilkan:

```text
Custom Release Version
```

## 2.3 Genre

```text
Field : Genre
Wajib : Ya
Sumber: tabel genres
```

Hanya genre aktif yang ditampilkan.

## 2.4 Subgenre

```text
Field : Subgenre
Wajib : Ya
Sumber: tabel subgenres
```

Aturan:

- Subgenre mengikuti Genre.
- Saat Genre berubah, Subgenre direset.
- Server wajib memastikan Subgenre berada di bawah Genre terpilih.
- `NA` tetap merupakan pilihan Subgenre resmi.

## 2.5 Instrumental

```text
Field   : Instrumental?
Pilihan : Yes / No
Wajib   : Ya
```

### Jika memilih Yes

Sembunyikan:

- Bahasa Lirik
- Explicit
- Lirik

Simpan:

```text
is_instrumental = 1
lyrics_language = NULL
explicit_type = NULL
lyrics = NULL
```

### Jika memilih No

Tampilkan:

- Bahasa Lirik
- Explicit
- Lirik

Simpan:

```text
is_instrumental = 0
```

## 2.6 Bahasa Lirik

Muncul hanya jika `Instrumental = No`.

```text
Field : Lyrics Language
Wajib : Ya
```

Gunakan master data bahasa. Jika memilih `Other`, tampilkan input bahasa lain.

## 2.7 Explicit

Muncul hanya jika `Instrumental = No`.

```text
Field   : Explicit Content
Pilihan : No / Clean / Yes
Wajib   : Ya
```

Kode penyimpanan:

```text
NO
CLEAN
YES
```

Definisi:

```text
No    : Tidak mengandung konten eksplisit.
Clean : Versi bersih dari lagu yang memiliki versi eksplisit.
Yes   : Mengandung konten eksplisit.
```

## 2.8 Lirik

Muncul hanya jika `Instrumental = No`.

```text
Field : Lyrics
Wajib : Ya
Jenis : Textarea
```

Aturan:

- Tidak boleh kosong.
- Pertahankan baris dan paragraf.
- Jangan mengubah kapitalisasi otomatis.
- Jangan menambahkan nama artis atau label otomatis.
- Tinggi textarea minimal 220 px.

---

# 3. Primary Artist

```text
Field : Primary Artist
Wajib : Ya
Jumlah: Minimal 1
```

Aturan:

- Dapat menambahkan lebih dari satu.
- Dipilih dari master data artist.
- Mendukung pencarian.
- Urutan dapat diubah.
- Hindari input nama bebas jika artist master tersedia.

Struktur:

```text
track_artists
- track_id
- artist_id
- role = PRIMARY
- sequence_number
```

---

# 4. Featured Artist

```text
Field : Featured Artist
Wajib : Tidak
```

Aturan:

- Dapat menambahkan lebih dari satu.
- Dipilih dari master artist.
- Urutan dapat diubah.
- Artist yang sama tidak boleh menjadi Primary dan Featured pada track yang sama.

Struktur:

```text
track_artists
- track_id
- artist_id
- role = FEATURED
- sequence_number
```

---

# 5. Add Contributor

Setiap baris berisi:

```text
Role *
Name *
```

User dapat:

- Menambah contributor.
- Menghapus contributor.
- Mengubah urutan.
- Memilih role.
- Mengisi nama contributor.

## Role Contributor

```text
Accordion
Acoustic Guitar
Alto Saxophone
Background Vocals
Banjo
Bass Guitar
Bass Saxophone
Bassoon
Bells
Cello
Choir
Clarinet
Conductor
Double Bass
Drums
Ensemble
Fiddle
Flugelhorn
Flute
Guitar
Harmonica
Harp
Horns
Keyboards
Lute
Oboe
Orchestra
Organ
Percussion
Piano
Programmer
Rap
Recorder
Remixer
Sampled Artist
Saxophone
Soprano Saxophone
Synthesizer
Tambourine
Tenor Saxophone
Trombone
Trumpet
Viola
Viola da gamba
Violin
Vocalist
Whistle
Xylophone
```

Contoh:

```text
Role : Drums
Name : Wahyu Piaji
```

---

# 6. Production & Additional Production

Setiap baris berisi:

```text
Role *
Name *
```

Role:

```text
Assistant Mastering Engineer
Assistant Mixing Engineer
Assistant Recording Engineer
Assistant Sound Engineer
Co-Producer
Creative Director
Editing Engineer
Graphic Design
Mastering Engineer
Mixing Engineer
Producer
Recording Engineer
Studio
Vocal Design
Vocal Edited
```

Contoh:

```text
Role : Producer
Name : Ryan Benyo
```

```text
Role : Mixing Engineer
Name : Mark Needham
```

Catatan:

- `Studio` tetap menggunakan field Name.
- Contoh nama Studio: `Clear Lake Studio Burbank`.
- Production tidak dicampur dengan contributor performer.

---

# 7. Songwriter / Composer

```text
Field : Songwriter / Composer
Wajib : Ya
Jumlah: Minimal 1
```

Setiap baris:

```text
Name *
```

Aturan:

- Dapat menambahkan lebih dari satu.
- Urutan dapat diubah.
- Gunakan nama asli sesuai informasi hak cipta.
- Jangan memakai nama band sebagai composer kecuali terdaftar secara sah.

---

# 8. Lyricists

```text
Field : Lyricists
Wajib : Kondisional
```

Setiap baris:

```text
Name *
```

Aturan:

- Dapat menambahkan lebih dari satu.
- Untuk track non-instrumental, minimal satu lyricist disarankan.
- Nama yang sama boleh muncul sebagai Composer dan Lyricist.
- Duplikasi lintas role tidak dianggap error.

---

# 9. Additional Writers

Setiap baris berisi:

```text
Role *
Name *
```

Role:

```text
Adapter
Arranger
Orchestrator
Publisher
String Arranger
Translator
Vocal Director
```

Aturan:

- Opsional.
- Dapat menambahkan lebih dari satu.
- Semua baris yang ditambahkan wajib memiliki Role dan Name.
- Tidak dicampur dengan Production atau Contributor.

---

# 10. Record Label

## Akun Perusahaan

Jika user mendaftar sebagai perusahaan, tampilkan:

```text
Record Label
```

Aturan:

- Diambil dari label milik perusahaan.
- Dapat berupa dropdown jika perusahaan memiliki beberapa label.
- Default menggunakan label utama.
- User hanya dapat memilih label yang dimiliki atau dapat diakses.

## Akun Personal

Field Record Label tidak ditampilkan, kecuali admin memberikan hak khusus.

Logika:

```ts
const showRecordLabel =
  user.accountType === "COMPANY" ||
  user.permissions.includes("SELECT_RECORD_LABEL");
```

---

# 11. Urutan Tampilan

```text
STEP 1 — AUDIO & TRACK DETAIL

A. Audio File
   1. Master Audio File
   2. Social Media Audio 30–60 Seconds

B. Track Information
   1. Track / Release Title
   2. Release Version
   3. Genre
   4. Subgenre
   5. Instrumental

C. Lyrics Information
   Ditampilkan jika Instrumental = No
   1. Lyrics Language
   2. Explicit Content
   3. Lyrics

D. Artist
   1. Primary Artist
   2. Featured Artist

E. Credits
   1. Add Contributor
   2. Production & Additional Production
   3. Songwriter / Composer
   4. Lyricists
   5. Additional Writers

F. Label
   1. Record Label
```

---

# 12. Tombol

```text
Save as Draft
Continue
```

## Save as Draft

- Dapat menyimpan form yang belum lengkap.
- Upload yang sudah selesai tetap tersimpan.
- Status release tetap `DRAFT`.
- Validasi bisnis penuh belum dijalankan.
- Validasi tipe data dan keamanan tetap dijalankan.

## Continue

User hanya dapat lanjut jika:

- File Master selesai dan valid.
- File Sosmed selesai dan valid.
- Durasi File Sosmed 30–60 detik.
- Judul terisi.
- Versi Rilis terisi.
- Genre terisi.
- Subgenre valid terhadap Genre.
- Instrumental dipilih.
- Jika non-instrumental, Bahasa Lirik, Explicit, dan Lirik terisi.
- Minimal satu Primary Artist.
- Minimal satu Songwriter / Composer.
- Record Label terisi jika diwajibkan untuk akun perusahaan.
- Semua baris Contributor memiliki Role dan Name.
- Semua baris Production memiliki Role dan Name.
- Semua baris Additional Writer memiliki Role dan Name.

---

# 13. Contoh Payload

```json
{
  "releaseType": "SINGLE",
  "masterUploadId": "uuid-master",
  "socialMediaUploadId": "uuid-social",
  "title": "On Our Own",
  "releaseVersion": "Original",
  "genreId": 14,
  "subgenreId": 207,
  "isInstrumental": false,
  "lyricsLanguage": "English",
  "explicitType": "NO",
  "lyrics": "Lyrics content...",
  "primaryArtists": [
    {
      "artistId": 101,
      "sequenceNumber": 1
    }
  ],
  "featuredArtists": [],
  "contributors": [
    {
      "roleId": 13,
      "name": "Wahyu Piaji",
      "sequenceNumber": 1
    }
  ],
  "productionCredits": [
    {
      "roleId": 11,
      "name": "Ryan Benyo",
      "sequenceNumber": 1
    },
    {
      "roleId": 10,
      "name": "Mark Needham",
      "sequenceNumber": 2
    }
  ],
  "songwriters": [
    {
      "name": "Rian Ekky Pradipta",
      "sequenceNumber": 1
    }
  ],
  "lyricists": [
    {
      "name": "Rian Ekky Pradipta",
      "sequenceNumber": 1
    }
  ],
  "additionalWriters": [
    {
      "roleId": 2,
      "name": "D'MASIV",
      "sequenceNumber": 1
    }
  ],
  "recordLabelId": 25
}
```

---

# 14. Validasi Zod

```ts
import { z } from "zod";

const namedCreditSchema = z.object({
  name: z.string().trim().min(2).max(180),
  sequenceNumber: z.number().int().positive(),
});

const roleCreditSchema = namedCreditSchema.extend({
  roleId: z.number().int().positive(),
});

export const singleReleaseStepOneSchema = z
  .object({
    masterUploadId: z.string().uuid(),
    socialMediaUploadId: z.string().uuid(),

    title: z.string().trim().min(1).max(255),
    releaseVersion: z.string().trim().min(1).max(100),

    genreId: z.number().int().positive(),
    subgenreId: z.number().int().positive(),

    isInstrumental: z.boolean(),

    lyricsLanguage: z.string().trim().nullable(),
    explicitType: z.enum(["NO", "CLEAN", "YES"]).nullable(),
    lyrics: z.string().trim().nullable(),

    primaryArtists: z
      .array(
        z.object({
          artistId: z.number().int().positive(),
          sequenceNumber: z.number().int().positive(),
        })
      )
      .min(1),

    featuredArtists: z.array(
      z.object({
        artistId: z.number().int().positive(),
        sequenceNumber: z.number().int().positive(),
      })
    ),

    contributors: z.array(roleCreditSchema),
    productionCredits: z.array(roleCreditSchema),

    songwriters: z.array(namedCreditSchema).min(1),
    lyricists: z.array(namedCreditSchema),
    additionalWriters: z.array(roleCreditSchema),

    recordLabelId: z.number().int().positive().nullable(),
  })
  .superRefine((data, context) => {
    if (!data.isInstrumental) {
      if (!data.lyricsLanguage) {
        context.addIssue({
          code: "custom",
          path: ["lyricsLanguage"],
          message: "Bahasa lirik wajib dipilih.",
        });
      }

      if (!data.explicitType) {
        context.addIssue({
          code: "custom",
          path: ["explicitType"],
          message: "Status explicit wajib dipilih.",
        });
      }

      if (!data.lyrics) {
        context.addIssue({
          code: "custom",
          path: ["lyrics"],
          message: "Lirik wajib diisi.",
        });
      }
    }
  });
```

Validasi Record Label berdasarkan session user dilakukan di server.

---

# 15. Validasi Server

Backend wajib memastikan:

1. Upload Master milik user.
2. Upload Sosmed milik user.
3. Kedua upload berstatus `COMPLETED`.
4. File purpose sesuai.
5. Format WAV atau FLAC.
6. Bit depth minimal 16-bit.
7. File Sosmed 30–60 detik.
8. Genre dan Subgenre aktif.
9. Subgenre berada di bawah Genre.
10. Primary Artist dapat diakses user.
11. Featured Artist dapat diakses user.
12. Role Contributor aktif.
13. Role Production aktif.
14. Role Additional Writer aktif.
15. Record Label dimiliki perusahaan user.
16. Primary dan Featured Artist tidak sama.
17. Upload ID tidak sedang digunakan release lain.

---

# 16. Struktur Database

```text
releases
tracks
release_uploads
track_artists
track_contributors
track_production_credits
track_songwriters
track_lyricists
track_additional_writers
genres
subgenres
record_labels
```

Untuk Single:

```text
1 release
1 track
2 audio uploads
```

## releases

```text
id
user_id
release_type
title
release_version
genre_id
subgenre_id
record_label_id
status
current_step
created_at
updated_at
```

## tracks

```text
id
release_id
title
is_instrumental
lyrics_language
explicit_type
lyrics
created_at
updated_at
```

## release_uploads

```text
id
release_id
track_id
upload_session_id
file_purpose
file_path
original_name
mime_type
file_size
duration_seconds
sample_rate
bit_depth
status
```

Nilai `file_purpose`:

```text
MASTER_AUDIO
SOCIAL_MEDIA_AUDIO
```

---

# 17. Transaction mysql2/promise

Saat tombol Continue dijalankan:

```text
BEGIN TRANSACTION

1. Insert atau update release.
2. Insert atau update track.
3. Hubungkan dua upload audio.
4. Hapus dan insert ulang track artists.
5. Hapus dan insert ulang contributors.
6. Hapus dan insert ulang production credits.
7. Hapus dan insert ulang songwriters.
8. Hapus dan insert ulang lyricists.
9. Hapus dan insert ulang additional writers.
10. Update current_step.

COMMIT
```

Jika gagal:

```text
ROLLBACK
```

Semua query menggunakan parameterized query dan `mysql2/promise`.

---

# 18. Standar UI

Gunakan section:

```text
[ Audio File ]
[ Track Information ]
[ Lyrics Information ]
[ Artists ]
[ Contributors ]
[ Production ]
[ Writers ]
[ Record Label ]
```

Ukuran:

```text
Judul Step       : 24–28 px
Judul Section    : 18–20 px
Label            : 14 px
Input            : 16 px
Helper Text      : 13–14 px
Tinggi Input     : 44 px
Textarea Lyrics  : minimal 220 px
```

Desktop contributor row:

```text
[ Role Dropdown ] [ Name Input ] [ Drag ] [ Delete ]
```

Mobile:

```text
[ Role Dropdown ]
[ Name Input ]
[ Delete ]
```

---

# 19. Checklist

## Audio

- [ ] Dua upload terpisah.
- [ ] Chunk upload.
- [ ] Resume upload.
- [ ] Tidak ada trim.
- [ ] WAV dan FLAC.
- [ ] Minimal 16-bit.
- [ ] Sosmed 30–60 detik.
- [ ] FFprobe setelah complete.

## Track

- [ ] Judul Track / Release.
- [ ] Versi Rilis.
- [ ] Genre.
- [ ] Subgenre.
- [ ] Instrumental Yes/No.
- [ ] Bahasa Lirik kondisional.
- [ ] Explicit kondisional.
- [ ] Lirik kondisional.

## Credit

- [ ] Primary Artist minimal satu.
- [ ] Featured Artist opsional.
- [ ] Contributor Role dan Name.
- [ ] Production Role dan Name.
- [ ] Songwriter / Composer minimal satu.
- [ ] Lyricists.
- [ ] Additional Writers Role dan Name.
- [ ] Record Label untuk perusahaan.

## Backend

- [ ] Next.js Route Handlers.
- [ ] MySQL.
- [ ] `mysql2/promise`.
- [ ] Tanpa Prisma.
- [ ] Parameterized query.
- [ ] Transaction.
- [ ] Validasi role dan relasi.
- [ ] File besar tidak dibaca seluruhnya ke memory.
