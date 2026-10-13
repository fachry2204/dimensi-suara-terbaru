<template>
  <div class="release-choice-page">
    <RouterLink to="/releases" class="release-back">← Kembali ke Data Rilis</RouterLink>
    <div class="release-choice-heading"><h1>Apa yang akan dirilis?</h1><p>Pilih format yang sesuai dengan musikmu.</p></div>
    <div class="release-choice-grid">
      <RouterLink to="/new-release/single" class="release-choice-card"><span class="release-choice-icon blue">♫</span><h2>Single Song</h2><p>Satu lagu untuk karya terbaru atau rilis mandiri.</p><strong>Pilih Single →</strong></RouterLink>
      <RouterLink to="/new-release/album" class="release-choice-card"><span class="release-choice-icon purple">◉</span><h2>EP / Album</h2><p>Dua track atau lebih untuk EP, album, atau kompilasi.</p><strong>Pilih Album →</strong></RouterLink>
    </div>
    <p class="release-choice-note">Pada tahap migrasi ini rilis akan disimpan sebagai draft, belum dikirim untuk distribusi.</p>
  </div>
</template>
