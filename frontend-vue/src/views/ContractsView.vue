<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api, type CmsUser } from '../api'
const props = defineProps<{ user: CmsUser | null }>()
const contracts = ref<any[]>([]), error = ref(''), busy = ref<number | null>(null), notice = ref('')
const staff = computed(() => ['admin','operator'].includes(props.user?.role.toLowerCase() || ''))
async function load(){ try { contracts.value=(await api<{contracts:any[]}>('/api/contracts')).contracts; error.value='' } catch(e){ error.value=(e as Error).message } }
async function send(item:any){ busy.value=item.id; notice.value=''; try { const result=await api<any>(`/api/contracts/${item.id}/send`,{method:'POST'}); notice.value=`Kontrak dikirim. Email: ${result.delivery.email}, WhatsApp: ${result.delivery.whatsapp}. Tautan: ${result.signing_url}`; await load() } catch(e){notice.value=(e as Error).message} finally{busy.value=null} }
async function copy(text:string){ await navigator.clipboard.writeText(text); notice.value='Tautan penandatanganan disalin.' }
onMounted(load)
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">DOKUMEN LEGAL</div><h1>Kontrak Digital</h1><p>Generate, kirim, dan pantau penandatanganan kontrak.</p></div></div>
  <p v-if="error" class="alert error">{{ error }}</p><p v-if="notice" class="alert">{{ notice }}</p>
  <section class="panel"><div class="table-scroll"><table><thead><tr><th>Kontrak</th><th v-if="staff">Pemilik</th><th>Dibuat</th><th>Status</th><th>Penandatanganan</th><th>Aksi</th></tr></thead><tbody>
    <tr v-for="item in contracts" :key="item.id"><td><strong>{{ item.file_name }}</strong><small>Versi {{ item.version }}</small></td><td v-if="staff">{{ item.full_name || item.company_name }}<small>{{ item.email }}</small></td><td>{{ item.generated_at || '—' }}</td><td><span class="pill">{{ item.status }}</span></td><td>{{ item.signing_status || 'Belum dikirim' }}<small v-if="item.signed_at">{{ item.signed_at }}</small></td><td class="contract-actions"><a class="text-button" :href="`/api/contracts/${item.id}/document`" target="_blank">Lihat</a><a class="text-button" :href="`/api/contracts/${item.id}/document?download=1`">Unduh</a><button v-if="staff && item.status !== 'SIGNED'" class="primary-button compact" :disabled="busy===item.id" @click="send(item)">{{ busy===item.id?'Mengirim…':'Kirim Kontrak' }}</button></td></tr>
  </tbody></table></div><p v-if="!contracts.length" class="empty">Belum ada kontrak.</p></section>
</template>
