<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api, type CmsUser, type Page, type Release } from '../api'
defineProps<{ user: CmsUser | null }>()
const recent = ref<Release[]>([])
const total = ref(0)
const error = ref('')
onMounted(async () => {
  try { const page = await api<Page<Release>>('/api/releases'); recent.value = page.data.slice(0, 5); total.value = page.total }
  catch (reason) { error.value = (reason as Error).message }
})
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">DASHBOARD</div><h1>Halo, {{ user?.name }}</h1><p>Ringkasan katalog yang sudah terhubung ke backend Laravel.</p></div></div>
  <p v-if="error" class="alert error">{{ error }}</p>
  <div class="stat-card"><span>Total rilis</span><strong>{{ total }}</strong><RouterLink to="/releases">Lihat semua rilis →</RouterLink></div>
  <section class="panel"><div class="panel-title"><h2>Rilis terbaru</h2><RouterLink to="/releases">Lihat daftar →</RouterLink></div>
    <p v-if="!recent.length" class="muted">Belum ada rilis yang dapat ditampilkan.</p>
    <div v-for="release in recent" :key="release.id" class="list-row"><span class="record-icon">♫</span><div><strong>{{ release.title }}</strong><small>{{ release.type }} · {{ release.owner_name || 'Milik saya' }}</small></div><span class="pill">{{ release.status }}</span></div>
  </section>
</template>
