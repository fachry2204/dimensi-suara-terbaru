<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api, type CmsUser, type Page, type Release } from '../api'
const props = defineProps<{ user: CmsUser | null }>()
const isAdmin = computed(() => props.user?.role.toLowerCase() === 'admin')
const items = ref<Release[]>([])
const current = ref(1), last = ref(1), total = ref(0), search = ref(''), error = ref(''), selected = ref<any>(null)
const review = ref({ status: 'Pending', aggregator: '', upc: '', reason: '', description: '' })
const reviewSaving = ref(false), reviewMessage = ref('')
async function load() {
  try {
    const page = await api<Page<Release>>(`/api/releases?page=${current.value}&q=${encodeURIComponent(search.value)}`)
    items.value = page.data; current.value = page.current_page; last.value = page.last_page; total.value = page.total; error.value = ''
  } catch (reason) { error.value = (reason as Error).message }
}
async function detail(id: number) {
  try {
    selected.value = await api(`/api/releases/${id}`)
    review.value = { status: selected.value.release.status || 'Pending', aggregator: selected.value.release.aggregator || '', upc: selected.value.release.upc || '', reason: selected.value.release.rejection_reason || '', description: selected.value.release.rejection_description || '' }
    reviewMessage.value = ''
  } catch (reason) { error.value = (reason as Error).message }
}
async function saveReview() {
  reviewSaving.value = true; reviewMessage.value = ''
  try {
    await api(`/api/releases/${selected.value.release.id}/review`, { method: 'PATCH', body: JSON.stringify({ ...review.value, tracks: selected.value.tracks.map((track: any) => ({ id: track.id, isrc: track.isrc || null })) }) })
    reviewMessage.value = 'Status rilis berhasil diperbarui.'
    await detail(selected.value.release.id); await load()
    reviewMessage.value = 'Status rilis berhasil diperbarui.'
  } catch (reason) { reviewMessage.value = (reason as Error).message }
  finally { reviewSaving.value = false }
}
function statusLabel(status: string) { return ({ Pending: 'Menunggu Review', 'Request Edit': 'Minta Revisi', Processing: 'Diproses', Live: 'Rilis', Rejected: 'Ditolak', Draft: 'Draft' } as Record<string, string>)[status] || status }
watch(search, () => { current.value = 1; load() })
onMounted(load)
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">KATALOG</div><h1>Data Rilis</h1><p>{{ total }} rilis terdaftar</p></div><div class="release-list-actions"><input v-model="search" class="search" placeholder="Cari judul rilis…" aria-label="Cari judul rilis" /><RouterLink to="/new-release" class="primary-button">+ Rilis Baru</RouterLink></div></div>
  <p v-if="error" class="alert error">{{ error }}</p>
  <section class="panel"><div class="table-scroll"><table><thead><tr><th>Rilis</th><th>Pemilik</th><th>Tipe</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>
    <tr v-for="release in items" :key="release.id"><td><div class="release-table-title"><span class="record-icon release-table-cover"><img v-if="release.cover_art || release.cover_url" :src="`/api/releases/${release.id}/cover`" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />♫</span><span><strong>{{ release.title }}</strong><small>UPC {{ release.upc || '—' }}</small></span></div></td><td>{{ release.owner_name || '—' }}</td><td>{{ release.type }}</td><td>{{ release.planned_release_date || '—' }}</td><td><span class="pill">{{ statusLabel(release.status) }}</span></td><td><div class="release-row-actions"><button class="text-button" @click="detail(release.id)">Detail</button><RouterLink v-if="release.status.toLowerCase() === 'draft'" :to="`/releases/${release.id}/edit`" class="text-button">Edit</RouterLink></div></td></tr>
  </tbody></table></div><p v-if="!items.length" class="empty">Tidak ada rilis ditemukan.</p></section>
  <div class="pagination"><button :disabled="current <= 1" @click="current--; load()">Sebelumnya</button><span>{{ current }} / {{ last }}</span><button :disabled="current >= last" @click="current++; load()">Berikutnya</button></div>
  <div v-if="selected" class="modal-backdrop" @click.self="selected = null"><div class="modal release-detail-modal"><button class="close" @click="selected = null">×</button><div class="eyebrow">DETAIL RILIS</div><img v-if="selected.release.cover_art || selected.release.cover_url" :src="`/api/releases/${selected.release.id}/cover`" alt="Cover rilis" class="release-detail-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" /><h2>{{ selected.release.title }}</h2><p>Pemilik: {{ selected.owner?.full_name || selected.owner?.company_name || `#${selected.release.user_id}` }} · {{ selected.release.type }} · {{ statusLabel(selected.release.status) }}</p><p>Aggregator: {{ selected.release.aggregator || '—' }} · UPC: {{ selected.release.upc || '—' }}</p><a v-if="selected.release.cover_art || selected.release.cover_url" :href="`/api/releases/${selected.release.id}/cover?download=1`" class="release-media-link">Unduh cover art</a>
    <section v-if="!isAdmin && ['Request Edit', 'Rejected'].includes(selected.release.status)" class="release-review-note"><strong>{{ selected.release.status === 'Rejected' ? 'Rilis ditolak' : 'Rilis perlu diperbaiki' }}</strong><p>{{ selected.release.rejection_reason }}</p><small v-if="selected.release.rejection_description">{{ selected.release.rejection_description }}</small></section>
    <section v-if="isAdmin" class="release-review-panel"><h3>Workflow Admin</h3><label>Status<select v-model="review.status"><option value="Pending">Menunggu Review</option><option value="Request Edit">Minta Revisi</option><option value="Processing">Diproses (Aggregator)</option><option value="Live">Rilis</option><option value="Rejected">Ditolak</option></select></label><label v-if="['Processing', 'Live'].includes(review.status)">Aggregator<input v-model="review.aggregator" placeholder="Contoh: SoundOn" /></label><label v-if="review.status === 'Live'">UPC<input v-model="review.upc" maxlength="50" /></label><template v-if="['Request Edit', 'Rejected'].includes(review.status)"><label>Alasan *<input v-model="review.reason" maxlength="255" /></label><label>Catatan untuk user<textarea v-model="review.description" rows="4" maxlength="5000"></textarea></label></template><p v-if="reviewMessage" class="release-review-message">{{ reviewMessage }}</p><button type="button" class="primary-button" :disabled="reviewSaving" @click="saveReview">{{ reviewSaving ? 'Menyimpan…' : 'Simpan Status' }}</button></section>
    <h3>Tracklist</h3><div v-for="track in selected.tracks" :key="track.id" class="release-detail-track"><strong>{{ track.title }}</strong><label v-if="isAdmin && review.status === 'Live'" class="release-isrc-field">ISRC<input v-model="track.isrc" maxlength="50" /></label><small v-else>ISRC {{ track.isrc || '—' }}</small><template v-if="track.audio_file"><span>Audio master</span><audio controls preload="none" :src="`/api/releases/${selected.release.id}/tracks/${track.id}/media/master`" /><a class="release-media-link" :href="`/api/releases/${selected.release.id}/tracks/${track.id}/media/master?download=1`">Unduh master</a></template><template v-if="track.audio_clip"><span>Clip media sosial</span><audio controls preload="none" :src="`/api/releases/${selected.release.id}/tracks/${track.id}/media/clip`" /><a class="release-media-link" :href="`/api/releases/${selected.release.id}/tracks/${track.id}/media/clip?download=1`">Unduh clip</a></template></div></div></div>
</template>
