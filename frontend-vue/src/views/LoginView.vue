<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const emit = defineEmits(['signed-in'])
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
async function submit() {
  error.value = ''; loading.value = true
  try {
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: email.value, password: password.value }) })
    emit('signed-in')
    router.push('/dashboard')
  } catch (reason) { error.value = (reason as Error).message }
  finally { loading.value = false }
}
</script>

<template>
  <section class="auth-card">
    <div class="eyebrow">SELAMAT DATANG</div><h1>Masuk ke Dimensi Suara</h1>
    <p>Kelola katalog dan akun Anda dalam satu tempat.</p>
    <form @submit.prevent="submit">
      <label>Email atau username<input v-model="email" required autocomplete="username" /></label>
      <label>Password<input v-model="password" required type="password" autocomplete="current-password" /></label>
      <p v-if="error" class="alert error" role="alert">{{ error }}</p>
      <button class="primary-button" :disabled="loading">{{ loading ? 'Memproses…' : 'Masuk' }}</button>
    </form>
    <p class="auth-link">Belum memiliki akun? <RouterLink to="/register">Daftar di sini</RouterLink></p>
  </section>
</template>
