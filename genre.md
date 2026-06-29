# Panduan Genre dan Subgenre DimensiSuaraNEW

## Ringkasan

Daftar baru terdiri dari **19 genre** dan **306 subgenre**.

Stack yang digunakan:

```text
Next.js App Router
MySQL
mysql2/promise
Tanpa Prisma
```

## File Pendamping

- `MIGRATION_GENRE_SUBGENRE_DIMENSISUARA.sql`
- `genre-subgenre-dimensisuara.json`

## Struktur Database

Gunakan tabel `genres` dan `subgenres`. Simpan `genre_id` dan `subgenre_id` pada tabel `releases`, bukan string bebas.

```sql
ALTER TABLE releases
  ADD COLUMN genre_id BIGINT UNSIGNED NULL,
  ADD COLUMN subgenre_id BIGINT UNSIGNED NULL,
  ADD KEY idx_releases_genre_id (genre_id),
  ADD KEY idx_releases_subgenre_id (subgenre_id),
  ADD CONSTRAINT fk_releases_genre FOREIGN KEY (genre_id)
    REFERENCES genres(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_releases_subgenre FOREIGN KEY (subgenre_id)
    REFERENCES subgenres(id) ON UPDATE CASCADE ON DELETE RESTRICT;
```

Jalankan hanya jika kolom tersebut belum ada.

## Validasi Relasi

Server wajib memastikan subgenre memang milik genre yang dipilih:

```ts
const [rows] = await db.execute<RowDataPacket[]>(
  `SELECT id FROM subgenres
   WHERE id = ? AND genre_id = ? AND is_active = 1
   LIMIT 1`,
  [subgenreId, genreId]
);

if (rows.length === 0) {
  throw new Error("Subgenre tidak sesuai dengan genre");
}
```

## API yang Disarankan

```text
GET /api/genres
GET /api/genres/:genreId/subgenres
```

Query genre:

```ts
const [genres] = await db.execute(
  `SELECT id, name, slug
   FROM genres
   WHERE is_active = 1
   ORDER BY sort_order, name`
);
```

Query subgenre:

```ts
const [subgenres] = await db.execute(
  `SELECT id, genre_id, name, slug
   FROM subgenres
   WHERE genre_id = ? AND is_active = 1
   ORDER BY sort_order, name`,
  [genreId]
);
```

## Perilaku Dropdown

1. User memilih Genre.
2. Subgenre dimuat sesuai Genre.
3. Saat Genre berubah, pilihan Subgenre lama harus direset.
4. `NA` tetap merupakan subgenre yang sah, bukan nilai `NULL`.
5. Bila hanya tersedia `NA`, sistem boleh memilihnya otomatis.
6. Validasi ulang selalu dilakukan di backend.

## Migrasi Data Lama

Jika `releases` masih menyimpan `genre` dan `subgenre` sebagai string:

```sql
UPDATE releases r
JOIN genres g ON LOWER(TRIM(g.name)) = LOWER(TRIM(r.genre))
JOIN subgenres sg
  ON sg.genre_id = g.id
 AND LOWER(TRIM(sg.name)) = LOWER(TRIM(r.subgenre))
SET r.genre_id = g.id,
    r.subgenre_id = sg.id
WHERE r.genre_id IS NULL OR r.subgenre_id IS NULL;
```

Periksa yang gagal dipetakan:

```sql
SELECT id, genre, subgenre
FROM releases
WHERE genre_id IS NULL OR subgenre_id IS NULL;
```

Jangan hapus kolom lama sebelum backup tersedia dan seluruh data berhasil dipetakan.

## Urutan Implementasi

1. Backup database.
2. Jalankan migration SQL.
3. Tambahkan foreign key pada `releases`.
4. Mapping data lama.
5. Buat API genre dan subgenre.
6. Ganti dropdown frontend menjadi dependent dropdown.
7. Tambahkan validasi backend.
8. Uji create dan edit release.
9. Uji data lama.
10. Nonaktifkan kolom string lama setelah stabil.

## Daftar Genre dan Subgenre

### Alternative/Indie

- Experimental
- Indie
- NA

### Latin

- Arrocha
- Axé
- Baile Funk
- Brega
- Bregafunk
- Forró
- MPB
- Pisadinha
- Reggaeton
- Sertanejo
- Banda
- Brazilian
- Corrido
- Cumbia
- Grupero
- Latin Pop
- Latin Urban
- Norteño
- Ranchera
- Regional Mexican
- Trap Latino
- Urbano
- Merengue
- Bolero
- Guaracha
- Salsa
- Aguinaldo
- Décima
- Seis
- Plena
- Parranda
- Tropical
- Dembow
- Regional
- Cuarteto
- Trio
- Son Cubano
- Tango
- Pagode
- Samba
- Bossa Nova
- NA

### Classical

- Classical Crossover
- Chorus
- Chamber Music
- Symphony
- Sonata
- Concerto
- Modern Classical
- NA

### Country

- Country Pop
- Bluegrass
- Country Rock
- Country Folk
- Nashville Sound
- Traditional Country
- Alternative Country
- Americana
- NA

### Blues

- Soul Blues
- Country Blues
- Jazz Blues
- Chicago Blues
- Texas Blues
- Delta Blues
- Contemporary Blues
- Boogie Woogie
- NA

### Electronic

- EDM
- Techno
- Lounge
- House
- Dubstep
- Future Bass
- Trance
- Drum&Bass
- Tropical House
- Melbourne Bounce
- Disco
- Vaporwave
- Chillout
- 8 Bit
- Trip Hop
- Ambient
- Deep Pop Edm
- EDM Trap
- Future House
- Bubblegum Bass
- Downtempo
- Breakbeat
- Folktronica
- Dark Ambient
- Chillwave
- Glitch
- Hardstyle
- Hi-NRG
- Bass House
- Synthwave
- Lo-Fi House
- NA

### Folk

- Folclor
- Pacific
- Porro
- Chinese Folk
- Folk Pop
- Indie Folk
- Contemporary Folk
- English Folk
- Irish Folk
- French Folk
- Korean Folk
- Japanese Folk
- African Folk
- Arabic Folk
- Traditional Folk
- NA

### Hip Hop/Rap

- Nerd Rap
- Trap
- Pacific Urban
- Urban Pop
- Drill
- Grime
- Trap Rap
- Jazz Hip Hop
- Alternative Hip Hop
- Old School
- Instrumental Hip Hop
- R&B Rap
- Desi Hip Hop
- Pop Rap
- Hardcore Rap
- Gangsta Rap
- West Coast Hip Hop
- East Coast Hip Hop
- Southern Hip Hop
- Midwest Hip Hop
- Comedy Hip Hop
- Hip House
- Chill Beats
- Drill Rap
- New School
- Boombap
- Emo Rap
- Freestyle
- NA

### Jazz

- Jazz Pop
- Jazz Fusion
- Traditional Jazz
- Avant-Garde Jazz
- Swing
- Big Band
- Bop
- Post-Bop
- Smooth Jazz
- Cool Jazz
- Vocal Jazz
- Nu Jazz
- Free Jazz
- Ragtime
- Acid Jazz
- Gypsy Jazz
- NA

### New Age

- NA

### Pop

- K-Pop
- Romantic
- Popular
- Afro
- Tex-Mex
- Teen Pop
- Indie Pop
- Dream Pop
- City Pop
- Synth Pop
- Celtic Pop
- Dance Pop
- Deep Dance Pop
- Indian Pop
- Chinese Pop
- J Pop
- Cantopop
- Taiwanese Pop
- French Pop
- Italian Pop
- African Pop
- German Pop
- Russian Pop
- Turkish Pop
- Arabic Pop
- Electropop
- Chamber Pop
- A Cappella
- Egyptian Pop
- NA

### R&B/Soul

- Funk
- R&B
- Soul
- Contemporary R&B
- Neo Soul
- Indo R&B
- Pop Soul
- Doo-Wop
- NA

### Reggae

- Dancehall
- Ska
- Dub
- Roots Reggae
- Pop Reggae
- NA

### Rock

- Metal
- Punk
- Spanish Rock
- Hard Rock
- Hard Core
- Alternative Rock
- Indie Rock
- Psychedelic Rock
- Post-Rock
- Pop Rock
- Lo-Fi
- Instrumental Rock
- J Rock
- Shoegazing
- Math Rock
- Surf Rock
- Progressive Rock
- Soft Rock
- Garage Rock
- Dark Wave
- Noise Rock
- Sadcore
- Space Rock
- Ethereal Wave
- Slowcore
- Rap Rock
- Brit Pop
- Folk Rock
- Roots Rock
- Grunge Rock
- Latin Rock
- NA
- Black Metal
- Death Metal
- Doom Metal
- Glam Metal
- Grindcore
- Power Metal
- Progressive Metal
- Speed Metal
- Thrash Metal
- Industrial Metal
- Folk Metal
- Rap Metal
- Heavy Metal
- Nu Metal
- Pop Punk
- Post-Punk
- New Wave
- Hardcore Punk
- Ska Punk
- No Wave
- Dance Punk
- Emo Punk
- Garage Punk
- Oi!/Street Punk

### World

- Dangdut
- Koplo/Koplo Remix
- Indian
- Korean Trot
- Shima Uta
- Enka
- Japanese Traditional Music
- Bhangra
- Flamenco
- Worldbeat
- Mongolian Folk Songs
- Uygur Folk Songs
- Fado
- Throat Singing
- Chanson
- Rumba
- Arabesk
- Mahraganat
- Sheilat and khaleeji
- Sufi music
- Pakistani folk music
- NA

### Childhood

- Educational
- Children's
- NA

### Devotional/Inspirational

- Gospel
- Religious/Devotional
- Holiday Music
- Christian Music
- Buddhist music
- Contemporary Christian Music
- NA

### Dance

- Bomba
- Danza
- Champeta
- Salsa Choke
- Amapiano
- NA

### Soundtrack

- NA

## Checklist

- [ ] Genre tampil sesuai urutan.
- [ ] Subgenre berubah sesuai genre.
- [ ] Subgenre lama direset saat genre berubah.
- [ ] Backend menolak subgenre dari genre lain.
- [ ] Nilai `NA` tersimpan sebagai subgenre resmi.
- [ ] Form edit menampilkan nilai lama.
- [ ] API hanya menampilkan item aktif.
- [ ] Semua query memakai `mysql2/promise`.
- [ ] Tidak menggunakan Prisma.
