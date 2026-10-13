<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, type CmsAccount, type CmsUser, type Page } from '../api'

const props = defineProps<{ user: CmsUser | null }>()
const route = useRoute()
const editId = computed(() => Number(route.params.id || 0))
const isEdit = computed(() => editId.value > 0)
const releaseType = ref<'SINGLE' | 'ALBUM'>(route.params.kind === 'album' ? 'ALBUM' : 'SINGLE')
const isAlbum = computed(() => releaseType.value === 'ALBUM')
const isAdmin = computed(() => props.user?.role.toLowerCase() === 'admin')
type TrackInput = { id?: number; title: string; isrc: string; masterPath: string; clipPath: string; masterName: string; clipName: string; language: string; instrumental: boolean; explicit: boolean; lyrics: string; writer: string; lyricist: string; producer: string }
type ReferenceItem = { id: number; name: string }
type ReferenceData = { genres: ReferenceItem[]; subgenres: Array<ReferenceItem & { genre_id: number }>; labels: ReferenceItem[]; artists: string[]; languages: string[]; versions: string[] }
function newTrack(): TrackInput { return { title: '', isrc: '', masterPath: '', clipPath: '', masterName: '', clipName: '', language: '', instrumental: false, explicit: false, lyrics: '', writer: '', lyricist: '', producer: '' } }
const form = ref({ title: '', version: 'Original', primaryArtist: '', genreId: 0, genre: '', subGenreId: 0, subGenre: '', recordLabelId: 0, language: '', label: '', pLine: '', cLine: '', plannedReleaseDate: '', originalReleaseDate: '', coverPath: '', coverName: '', tracks: [] as TrackInput[] })
const references = ref<ReferenceData>({ genres: [], subgenres: [], labels: [], artists: [], languages: [], versions: [] })
const availableSubgenres = computed(() => references.value.subgenres.filter(item => item.genre_id === form.value.genreId))
const ownerSearch = ref(''), ownerOptions = ref<CmsAccount[]>([]), selectedOwner = ref<CmsAccount | null>(null), ownerOpen = ref(false), ownerLoading = ref(false)
const saving = ref(false), uploading = ref(false), loading = ref(isEdit.value), error = ref(''), completed = ref<{ id: number; status: string } | null>(null), coverPreview = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchSequence = 0

function resetTracks() { form.value.tracks = isAlbum.value ? [newTrack(), newTrack()] : [newTrack()] }
if (!isEdit.value) resetTracks()
watch(ownerSearch, () => {
  if (!isAdmin.value) return
  clearTimeout(searchTimer)
  const sequence = ++searchSequence
  searchTimer = setTimeout(async () => {
    ownerLoading.value = true
    try {
      const page = await api<Page<CmsAccount>>(`/api/users?role=User&q=${encodeURIComponent(ownerSearch.value)}`)
      if (sequence === searchSequence) ownerOptions.value = page.data
    } catch (reason) { if (sequence === searchSequence) error.value = (reason as Error).message }
    finally { if (sequence === searchSequence) ownerLoading.value = false }
  }, 220)
}, { immediate: true })
watch(() => form.value.title, (title) => {
  if (!isAlbum.value && form.value.tracks[0] && !form.value.tracks[0].title) form.value.tracks[0].title = title
})
watch(() => selectedOwner.value?.id, (ownerId) => { if (isAdmin.value && ownerId) loadReferences(ownerId) })
watch(() => form.value.genreId, (genreId, previous) => {
  const genre = references.value.genres.find(item => item.id === genreId)
  if (genre) form.value.genre = genre.name
  if (previous && previous !== genreId) { form.value.subGenreId = 0; form.value.subGenre = '' }
})
watch(() => form.value.subGenreId, (subGenreId) => {
  const subgenre = references.value.subgenres.find(item => item.id === subGenreId)
  if (subgenre) form.value.subGenre = subgenre.name
})
watch(() => form.value.label, (label) => {
  form.value.recordLabelId = references.value.labels.find(item => item.name.toLowerCase() === label.trim().toLowerCase())?.id || 0
})
async function loadReferences(ownerId?: number) {
  const query = ownerId ? `?user_id=${ownerId}` : ''
  references.value = await api<ReferenceData>(`/api/reference/release-form${query}`)
  if (form.value.label) form.value.recordLabelId = references.value.labels.find(item => item.name.toLowerCase() === form.value.label.trim().toLowerCase())?.id || form.value.recordLabelId
}
onMounted(async () => {
  if (!isAdmin.value) await loadReferences()
  if (!isEdit.value) return
  try {
    const data = await api<any>(`/api/releases/${editId.value}`)
    if (String(data.release.status).toLowerCase() !== 'draft') throw new Error('Hanya rilis Draft yang dapat diedit.')
    releaseType.value = String(data.release.release_type || data.release.type).toUpperCase().includes('SINGLE') ? 'SINGLE' : 'ALBUM'
    let artists: string[] = []
    try { artists = JSON.parse(data.release.primary_artists || '[]') } catch { artists = [] }
    form.value = {
      title: data.release.title || '', version: data.release.version || 'Original', primaryArtist: artists[0] || '',
      genreId: Number(data.release.genre_id || 0), genre: data.release.genre || '', subGenreId: Number(data.release.subgenre_id || 0), subGenre: data.release.sub_genre || '', recordLabelId: Number(data.release.record_label_id || 0), language: data.release.language || '', label: data.release.label || '',
      pLine: data.release.p_line || '', cLine: data.release.c_line || '', plannedReleaseDate: data.release.planned_release_date || '',
      originalReleaseDate: data.release.original_release_date || '', coverPath: data.release.cover_art || data.release.cover_url || '',
      coverName: data.release.cover_art || data.release.cover_url ? 'Cover saat ini' : '',
      tracks: data.tracks.map((track: any) => ({ id: track.id, title: track.title || '', isrc: track.isrc || '', masterPath: track.audio_file || '', clipPath: track.audio_clip || '', masterName: track.audio_file ? 'Audio master saat ini' : '', clipName: track.audio_clip ? 'Clip saat ini' : '', language: track.language || '', instrumental: Boolean(track.is_instrumental), explicit: Boolean(track.explicit), lyrics: track.lyrics || '', writer: track.writer || '', lyricist: track.lyricist || '', producer: track.producer || '' })),
    }
    if (data.owner) selectOwner(data.owner)
    if (form.value.coverPath) coverPreview.value = `/api/releases/${editId.value}/cover`
  } catch (reason) { error.value = (reason as Error).message }
  finally { loading.value = false }
})
onBeforeUnmount(() => { clearTimeout(searchTimer); if (coverPreview.value.startsWith('blob:')) URL.revokeObjectURL(coverPreview.value) })
function addTrack() { form.value.tracks.push(newTrack()) }
function removeTrack(index: number) {
  if (!isAlbum.value || form.value.tracks.length <= 2) return
  const track = form.value.tracks[index]
  const hasContent = Boolean(track.title.trim() || track.masterPath || track.clipPath || track.isrc.trim())
  if (hasContent && !window.confirm('Hapus track ini dari album?')) return
  form.value.tracks.splice(index, 1)
}
function ownerName(owner: CmsAccount) { return owner.full_name || owner.company_name || owner.username || owner.email }
function selectOwner(owner: CmsAccount) { selectedOwner.value = owner; ownerSearch.value = `${ownerName(owner)} — ${owner.email}`; ownerOpen.value = false }
async function upload(event: Event, kind: 'cover' | 'master' | 'clip', track?: TrackInput) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]
  if (!file) return
  error.value = ''; uploading.value = true
  try {
    const body = new FormData(); body.append('kind', kind); body.append('file', file)
    const result = await api<{ path: string; name: string }>('/api/releases/uploads', { method: 'POST', body })
    if (kind === 'cover') {
      form.value.coverPath = result.path; form.value.coverName = result.name
      if (coverPreview.value.startsWith('blob:')) URL.revokeObjectURL(coverPreview.value)
      coverPreview.value = URL.createObjectURL(file)
    } else if (track) {
      if (kind === 'master') { track.masterPath = result.path; track.masterName = result.name }
      else { track.clipPath = result.path; track.clipName = result.name }
    }
  } catch (reason) { error.value = (reason as Error).message }
  finally { uploading.value = false; input.value = '' }
}
function payload() {
  return {
    type: releaseType.value, userId: isAdmin.value ? selectedOwner.value?.id : undefined,
    title: form.value.title, version: form.value.version, primaryArtist: form.value.primaryArtist,
    genreId: form.value.genreId || null, genre: form.value.genre, subGenreId: form.value.subGenreId || null, subGenre: form.value.subGenre,
    recordLabelId: form.value.recordLabelId || null, language: form.value.language, label: form.value.label,
    pLine: form.value.pLine, cLine: form.value.cLine, plannedReleaseDate: form.value.plannedReleaseDate || null,
    originalReleaseDate: form.value.originalReleaseDate || null, coverPath: form.value.coverPath || null,
    tracks: form.value.tracks.map(track => ({ id: track.id, title: track.title.trim(), isrc: track.isrc || null, masterPath: track.masterPath || null, clipPath: track.clipPath || null, language: track.language || null, instrumental: track.instrumental, explicit: track.explicit, lyrics: track.lyrics || null, writer: track.writer || null, lyricist: track.lyricist || null, producer: track.producer || null })),
  }
}
async function persist(submit: boolean) {
  error.value = ''
  if (isAdmin.value && !selectedOwner.value) { error.value = 'Pilih user pemilik rilis terlebih dahulu.'; return }
  if (isAlbum.value && form.value.tracks.length < 2) { error.value = 'Album/EP harus berisi minimal dua track.'; return }
  saving.value = true
  try {
    const url = isEdit.value ? `/api/releases/${editId.value}${submit ? '/submit' : ''}` : '/api/releases'
    const method = isEdit.value ? (submit ? 'POST' : 'PUT') : 'POST'
    completed.value = await api<{ id: number; status: string }>(url, { method, body: JSON.stringify(payload()) })
  } catch (reason) { error.value = (reason as Error).message }
  finally { saving.value = false }
}
</script>

<template>
  <div class="release-form-page">
    <RouterLink :to="isEdit ? '/releases' : '/new-release'" class="release-back">← {{ isEdit ? 'Kembali ke data rilis' : 'Pilih format lain' }}</RouterLink>
    <section v-if="completed" class="panel release-created"><span class="release-created-icon">✓</span><h1>{{ completed.status === 'Pending' ? 'Rilis berhasil dikirim' : 'Draft rilis tersimpan' }}</h1><p>{{ isAlbum ? 'Album/EP' : 'Single' }} #{{ completed.id }} {{ completed.status === 'Pending' ? 'telah masuk antrean review admin.' : 'tersimpan dan masih dapat diedit sebelum dikirim.' }}</p><RouterLink to="/releases" class="primary-button">Lihat Data Rilis</RouterLink></section>
    <p v-else-if="loading" class="panel empty">Memuat draft rilis…</p>
    <template v-else>
      <div class="page-heading release-form-heading"><div><div class="eyebrow">{{ isEdit ? 'EDIT DRAFT' : 'RILIS BARU' }}</div><h1>{{ isAlbum ? 'Album / EP' : 'Single' }}</h1><p>Lengkapi metadata, simpan draft, lalu kirim untuk direview.</p></div><span class="release-draft-tag">Draft · belum dikirim</span></div>
      <form @submit.prevent="persist(false)" class="release-editor">
        <section v-if="isAdmin" class="panel release-owner-panel"><h2>Rilis ini milik user siapa? *</h2><p>Pilih akun yang akan tercatat sebagai pemilik rilis.</p><div class="release-owner-picker"><input v-model="ownerSearch" :aria-expanded="ownerOpen" role="combobox" aria-controls="release-owner-options" aria-label="Cari user pemilik rilis" placeholder="Cari nama atau email user…" @focus="ownerOpen = true" @input="selectedOwner = null" /><div v-if="ownerOpen" id="release-owner-options" class="release-owner-options" role="listbox"><span v-if="ownerLoading" class="release-owner-empty">Mencari user…</span><button v-for="owner in ownerOptions" :key="owner.id" type="button" role="option" :aria-selected="selectedOwner?.id === owner.id" @click="selectOwner(owner)"><strong>{{ ownerName(owner) }}</strong><small>{{ owner.email }}</small></button><span v-if="!ownerLoading && !ownerOptions.length" class="release-owner-empty">User tidak ditemukan</span></div></div><small v-if="selectedOwner" class="release-owner-selected">Pemilik terpilih: {{ ownerName(selectedOwner) }}</small></section>
        <section class="panel"><h2>Informasi rilis</h2><div class="field-grid"><label>Judul rilis *<input v-model="form.title" required maxlength="255" /></label><label>Versi<select v-model="form.version"><option v-for="version in references.versions" :key="version" :value="version">{{ version }}</option></select></label><label>Artis utama *<input v-model="form.primaryArtist" list="release-artists" maxlength="255" placeholder="Cari atau tulis nama artis" /><datalist id="release-artists"><option v-for="artist in references.artists" :key="artist" :value="artist" /></datalist></label><label>Genre *<select v-model="form.genreId"><option :value="0">Pilih genre</option><option v-if="!form.genreId && form.genre" :value="0">{{ form.genre }}</option><option v-for="genre in references.genres" :key="genre.id" :value="genre.id">{{ genre.name }}</option></select></label><label>Subgenre<select v-model="form.subGenreId" :disabled="!form.genreId"><option :value="0">Pilih subgenre</option><option v-for="subgenre in availableSubgenres" :key="subgenre.id" :value="subgenre.id">{{ subgenre.name }}</option></select></label><label>Bahasa *<select v-model="form.language"><option value="">Pilih bahasa/wilayah</option><option v-for="language in references.languages" :key="language" :value="language">{{ language }}</option></select></label><label>Label rekaman *<input v-model="form.label" list="release-labels" maxlength="100" placeholder="Pilih atau tulis nama label" /><datalist id="release-labels"><option v-for="label in references.labels" :key="label.id" :value="label.name" /></datalist></label><label>Tanggal rilis direncanakan *<input v-model="form.plannedReleaseDate" type="date" :min="isAdmin ? undefined : new Date().toISOString().slice(0, 10)" /></label><label>Tanggal rilis asli<input v-model="form.originalReleaseDate" type="date" /></label><label>P-Line *<input v-model="form.pLine" maxlength="255" placeholder="℗ Tahun Pemilik Rekaman" /></label><label>C-Line *<input v-model="form.cLine" maxlength="255" placeholder="© Tahun Pemilik Hak Cipta" /></label><label>Cover art * (JPG/PNG, maks. 10 MB)<input type="file" accept=".jpg,.jpeg,.png" :disabled="uploading" @change="upload($event, 'cover')" /><small v-if="form.coverName" class="release-uploaded">✓ {{ form.coverName }}</small></label></div><img v-if="coverPreview" :src="coverPreview" alt="Pratinjau cover art" class="release-cover-preview" /></section>
        <section class="panel"><div class="panel-title"><h2>Tracklist</h2><button v-if="isAlbum" type="button" class="text-button" @click="addTrack">+ Tambah track</button></div><p class="release-helper">User wajib menyertakan audio master dan clip saat mengirim final. Admin boleh menyimpan maupun mengirim tanpa audio.</p><div v-for="(track, index) in form.tracks" :key="track.id || `new-${index}`" class="release-track"><div class="release-track-heading"><strong>Track {{ index + 1 }}</strong><button v-if="isAlbum && form.tracks.length > 2" type="button" class="text-button" @click="removeTrack(index)">Hapus</button></div><div class="field-grid"><label>Judul track *<input v-model="track.title" required maxlength="255" /></label><label>ISRC (jika sudah ada)<input v-model="track.isrc" maxlength="50" /></label><label>Bahasa track<select v-model="track.language"><option value="">Ikuti bahasa rilis</option><option v-for="language in references.languages" :key="language" :value="language">{{ language }}</option></select></label><label>Penulis / komposer<input v-model="track.writer" maxlength="1000" /></label><label>Penulis lirik<input v-model="track.lyricist" maxlength="1000" /></label><label>Produser<input v-model="track.producer" maxlength="1000" /></label><label>Audio master (WAV/FLAC)<input type="file" accept=".wav,.flac" :disabled="uploading" @change="upload($event, 'master', track)" /><small v-if="track.masterName" class="release-uploaded">✓ {{ track.masterName }}</small></label><label>Clip media sosial (WAV/FLAC)<input type="file" accept=".wav,.flac" :disabled="uploading" @change="upload($event, 'clip', track)" /><small v-if="track.clipName" class="release-uploaded">✓ {{ track.clipName }}</small></label></div><div class="release-checks"><label><input v-model="track.instrumental" type="checkbox" /> Instrumental</label><label><input v-model="track.explicit" type="checkbox" /> Konten eksplisit</label></div><label class="release-lyrics">Lirik<textarea v-model="track.lyrics" rows="4" maxlength="20000"></textarea></label></div></section>
        <p v-if="error" class="alert error" role="alert">{{ error }}</p><div class="release-form-actions"><RouterLink to="/releases" class="release-cancel">Batal</RouterLink><button type="submit" class="secondary-button" :disabled="saving || uploading">{{ saving ? 'Memproses…' : 'Simpan Draft' }}</button><button v-if="isEdit" type="button" class="primary-button" :disabled="saving || uploading" @click="persist(true)">Kirim untuk Review</button></div>
      </form>
    </template>
  </div>
</template>
