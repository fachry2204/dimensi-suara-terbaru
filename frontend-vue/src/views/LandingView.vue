<script setup lang="ts">
import { ref } from 'vue'
import type { CmsUser } from '../api'

defineProps<{ user: CmsUser | null }>()
const mobileMenuOpen = ref(false)
const services = [
  { image: '/landing/distribution.png', title: 'Distribusi Digital', copy: 'Rilis musikmu ke platform digital dari satu tempat, dengan proses yang jelas di setiap tahap.' },
  { image: '/landing/publishing.png', title: 'Publishing Royalti', copy: 'Kelola hak cipta lagu dan pantau informasi royalti karya musikmu secara terstruktur.' },
  { image: '/landing/analytics.png', title: 'Analitik Rilis', copy: 'Lihat laporan dan pahami performa katalog untuk menentukan langkah berikutnya.' },
]
function closeMenu() { mobileMenuOpen.value = false }
</script>

<template>
  <div class="landing-page">
    <div id="home" class="landing-opening">
      <header class="landing-header landing-container">
        <RouterLink to="/" class="landing-logo" aria-label="Dimensi Suara, beranda">DIMENSI <span>SUARA</span></RouterLink>
        <button class="landing-menu-button" type="button" :aria-expanded="mobileMenuOpen" aria-controls="landing-navigation" aria-label="Buka menu" @click="mobileMenuOpen = !mobileMenuOpen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <nav id="landing-navigation" class="landing-nav" :class="{ open: mobileMenuOpen }" aria-label="Navigasi utama">
          <a href="#home" @click="closeMenu">Home</a><a href="#layanan" @click="closeMenu">Layanan</a><a href="#rilis" @click="closeMenu">Rilis</a><a href="#royalti" @click="closeMenu">Royalti</a><a href="#kontak" @click="closeMenu">Kontak</a>
        </nav>
        <div class="landing-header-actions"><RouterLink :to="user ? '/dashboard' : '/login'" class="landing-signin">{{ user ? 'Dashboard' : 'Masuk' }}</RouterLink><RouterLink v-if="!user" to="/register" class="landing-button landing-button-small">Daftar Gratis</RouterLink></div>
      </header>

      <section class="landing-hero landing-container" aria-labelledby="landing-title">
        <div class="landing-hero-copy">
          <h1 id="landing-title">Distribusikan Musikmu <span>ke Seluruh Dunia</span></h1>
          <p>Dimensi Suara membantu musisi dan label independen mendistribusikan musik secara digital, mengelola publishing dan royalti, serta memahami performa rilis — semua dalam satu platform.</p>
          <div class="landing-hero-actions"><RouterLink :to="user ? '/dashboard' : '/register'" class="landing-button">{{ user ? 'Buka Dashboard' : 'Mulai Sekarang' }} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink><a href="#layanan" class="landing-outline-button">Lihat Layanan</a></div>
        </div>
      </section>
    </div>

    <section id="layanan" class="landing-services landing-container" aria-labelledby="services-title"><h2 id="services-title" class="visually-hidden">Layanan Dimensi Suara</h2>
      <article v-for="service in services" :key="service.title" class="landing-service"><img :src="service.image" :alt="service.title" loading="lazy" /><div><h3>{{ service.title }}</h3><p>{{ service.copy }}</p><a href="#kontak">Pelajari lebih lanjut <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></a></div></article>
    </section>

    <section id="rilis" class="landing-release-band"><div class="landing-container landing-release-content"><h2>Dari karya pertama hingga katalog berikutnya.</h2><p>Unggah dan kelola rilis musikmu melalui akun Dimensi Suara. Pantau status setiap karya dalam satu tempat.</p><RouterLink :to="user ? '/releases' : '/register'">{{ user ? 'Lihat Rilis Saya' : 'Mulai Rilis Musik' }} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink></div></section>

    <section id="royalti" class="landing-royalty"><div class="landing-container landing-royalty-content"><h2>Transparansi Royalti,<br /><span>untuk langkah yang lebih jelas.</span></h2><p>Setiap karya musik memiliki nilai. Informasi royalti dan laporan yang tertata membantu kamu fokus pada proses berkarya.</p><RouterLink :to="user ? '/dashboard' : '/register'" class="landing-outline-button">Pelajari Tentang Royalti <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink></div></section>

    <section id="kontak" class="landing-final landing-container"><h2>Siap Membawa Musikmu Lebih Jauh?</h2><p>Bergabunglah dengan Dimensi Suara dan mulai perjalanan musikmu.</p><RouterLink :to="user ? '/dashboard' : '/register'" class="landing-button">{{ user ? 'Buka Dashboard' : 'Daftar Gratis' }} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></RouterLink></section>
    <footer class="landing-footer landing-container"><RouterLink to="/" class="landing-logo">DIMENSI <span>SUARA</span></RouterLink><p>Musik tanpa batas, untuk lebih banyak cerita.</p><span>© {{ new Date().getFullYear() }} Dimensi Suara</span></footer>
  </div>
</template>
