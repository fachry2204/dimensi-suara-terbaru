<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, type CmsUser } from './api'

const route = useRoute()
const router = useRouter()
const user = ref<CmsUser | null>(null)
const ready = ref(false)
const publicPage = computed(() => ['/', '/login', '/register'].includes(route.path) || route.path.startsWith('/contract/sign/'))

async function refresh() {
  try { user.value = (await api<{ user: CmsUser | null }>(publicPage.value ? '/api/auth/session' : '/api/auth/me')).user }
  catch { user.value = null }
  ready.value = true
  if (!user.value && !publicPage.value) router.replace('/login')
}
async function logout() {
  await api('/api/auth/logout', { method: 'POST' })
  user.value = null
  router.push('/login')
}
onMounted(async () => { await router.isReady(); if (publicPage.value) ready.value = true; await refresh() })
router.afterEach((to) => { if (ready.value && !user.value && !['/', '/login', '/register'].includes(to.path) && !to.path.startsWith('/contract/sign/')) router.replace('/login') })
</script>

<template>
  <div v-if="ready" class="app-shell">
    <header v-if="route.path !== '/'" class="topbar">
      <RouterLink to="/" class="brand"><span class="brand-mark">♫</span><span>Dimensi Suara</span><small>CMS baru</small></RouterLink>
      <div v-if="user" class="top-user"><span>{{ user.name }}</span><button class="text-button" @click="logout">Keluar</button></div>
    </header>
    <div class="workspace" :class="{ public: publicPage, landing: route.path === '/' }">
      <aside v-if="user && !publicPage" class="sidebar">
        <span class="nav-label">MENU UTAMA</span>
        <RouterLink to="/dashboard">Ringkasan</RouterLink>
        <RouterLink to="/releases">Data Rilis</RouterLink>
        <RouterLink to="/new-release">Rilis Baru</RouterLink>
        <RouterLink to="/contracts">Kontrak Digital</RouterLink>
        <RouterLink to="/reports">Report & Royalti</RouterLink>
        <RouterLink v-if="['admin', 'operator'].includes(user.role.toLowerCase())" to="/users">Pengguna</RouterLink>
        <div class="sidebar-note">Migrasi sedang berlangsung. Fitur lain tetap tersedia di aplikasi lama.</div>
      </aside>
      <main class="content"><RouterView :user="user" @signed-in="refresh" /></main>
    </div>
  </div>
</template>
