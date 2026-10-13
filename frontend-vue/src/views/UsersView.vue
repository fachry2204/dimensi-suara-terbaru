<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api, type CmsAccount, type CmsUser, type Page } from '../api'
const props = defineProps<{ user: CmsUser | null }>()
const isAdmin = computed(() => props.user?.role.toLowerCase() === 'admin')
const items = ref<CmsAccount[]>([]), search = ref(''), error = ref(''), total = ref(0), current = ref(1), last = ref(1), tab = ref<'User' | 'Admin'>('User')
const selected = ref<any>(null), detailLoading = ref(false), saving = ref(false), message = ref('')
const creating = ref(false), staffSaving = ref(false), staffMessage = ref('')
const staffForm = ref({ role: 'Operator', name: '', email: '', password: '' })
const newPassword = ref(''), confirmPassword = ref('')
const contractBusy = ref(false), contractMessage = ref('')
const edit = ref({ status: 'Pending', rejectionReason: '', blockReason: '', aggregatorPercentage: 0, publishingPercentage: 0 })
const documentLabels: Record<string, string> = { ktp_doc_path: 'KTP', npwp_doc_path: 'NPWP', signature_doc_path: 'Tanda Tangan', nib_doc_path: 'NIB', kemenkumham_doc_path: 'Kemenkumham', contract_doc_path: 'Kontrak' }
async function load() {
  try { const page = await api<Page<CmsAccount>>(`/api/users?page=${current.value}&role=${tab.value}&q=${encodeURIComponent(search.value)}`); items.value = page.data; total.value = page.total; current.value = page.current_page; last.value = page.last_page; error.value = '' }
  catch (reason) { error.value = (reason as Error).message }
}
async function detail(id: number) {
  detailLoading.value = true; message.value = ''
  try {
    selected.value = await api(`/api/users/${id}`)
    const account = selected.value.user
    edit.value = { status: account.status || 'Pending', rejectionReason: account.rejection_reason || '', blockReason: account.block_reason || '', aggregatorPercentage: Number(account.aggregator_percentage || 0), publishingPercentage: Number(account.publishing_percentage || 0) }
  } catch (reason) { error.value = (reason as Error).message }
  finally { detailLoading.value = false }
}
async function save() {
  saving.value = true; message.value = ''
  try {
    await api(`/api/users/${selected.value.user.id}`, { method: 'PATCH', body: JSON.stringify(edit.value) })
    message.value = 'Data dan status pengguna berhasil disimpan.'; await detail(selected.value.user.id); await load(); message.value = 'Data dan status pengguna berhasil disimpan.'
  } catch (reason) { message.value = (reason as Error).message }
  finally { saving.value = false }
}
async function createStaff() {
  staffSaving.value = true; staffMessage.value = ''
  try {
    await api('/api/admins', { method: 'POST', body: JSON.stringify(staffForm.value) })
    creating.value = false; staffForm.value = { role: 'Operator', name: '', email: '', password: '' }; await load()
  } catch (reason) { staffMessage.value = (reason as Error).message }
  finally { staffSaving.value = false }
}
async function resetStaffPassword() {
  if (newPassword.value !== confirmPassword.value) { message.value = 'Konfirmasi password tidak sama.'; return }
  saving.value = true; message.value = ''
  try {
    await api(`/api/admins/${selected.value.user.id}/password`, { method: 'PATCH', body: JSON.stringify({ password: newPassword.value, password_confirmation: confirmPassword.value }) })
    newPassword.value = ''; confirmPassword.value = ''; message.value = 'Password staf berhasil diperbarui.'
  } catch (reason) { message.value = (reason as Error).message }
  finally { saving.value = false }
}
async function generateContract() {
  contractBusy.value = true; contractMessage.value = ''
  try { const result = await api<any>(`/api/users/${selected.value.user.id}/contracts/generate`, { method: 'POST' }); contractMessage.value = result.message }
  catch (reason) { contractMessage.value = (reason as Error).message }
  finally { contractBusy.value = false }
}
watch([search, tab], () => { current.value = 1; load() })
onMounted(load)
</script>
<template>
  <div class="page-heading"><div><div class="eyebrow">ADMINISTRASI</div><h1>{{ tab === 'User' ? 'Pengguna' : 'Admin' }}</h1><p>{{ total }} akun ditemukan</p></div><div class="user-heading-actions"><input v-model="search" class="search" placeholder="Cari nama atau email…" aria-label="Cari pengguna" /><button v-if="tab === 'Admin' && isAdmin" class="primary-button" @click="creating = true">+ Admin Baru</button></div></div>
  <div class="user-tabs"><button :class="{ active: tab === 'User' }" @click="tab = 'User'">User</button><button :class="{ active: tab === 'Admin' }" @click="tab = 'Admin'">Admin & Operator</button></div>
  <p v-if="error" class="alert error">{{ error }}</p>
  <section class="panel"><div class="table-scroll"><table><thead><tr><th>Nama</th><th>Email</th><th>Jenis</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody><tr v-for="account in items" :key="account.id"><td><strong>{{ account.full_name || account.company_name || '—' }}</strong><small>#{{ account.id }}</small></td><td>{{ account.email }}</td><td>{{ account.type }}</td><td>{{ account.role }}</td><td><span class="pill">{{ account.status }}</span></td><td><button class="text-button" @click="detail(account.id)">Detail</button></td></tr></tbody></table></div><p v-if="!items.length" class="empty">Tidak ada pengguna ditemukan.</p></section>
  <div class="pagination"><button :disabled="current <= 1" @click="current--; load()">Sebelumnya</button><span>{{ current }} / {{ last }}</span><button :disabled="current >= last" @click="current++; load()">Berikutnya</button></div>
  <div v-if="selected || detailLoading" class="modal-backdrop" @click.self="selected = null"><div class="modal user-detail-modal"><button class="close" @click="selected = null">×</button><p v-if="detailLoading">Memuat pengguna…</p><template v-else-if="selected"><div class="eyebrow">DETAIL {{ selected.user.role.toUpperCase() }}</div><h2>{{ selected.user.full_name || selected.user.company_name || selected.user.username }}</h2><p>{{ selected.user.email }} · {{ selected.user.role }} · {{ selected.user.status }}</p>
    <div v-if="selected.user.role.toLowerCase() !== 'user'" class="user-admin-summary"><div><small>Role</small><strong>{{ selected.user.role }}</strong></div><div><small>Nama</small><strong>{{ selected.user.full_name || selected.user.username }}</strong></div><div><small>Email</small><strong>{{ selected.user.email }}</strong></div><p>Password tidak ditampilkan demi keamanan.</p><form v-if="isAdmin" class="staff-password-form" @submit.prevent="resetStaffPassword"><h3>Reset Password</h3><label>Password baru<input v-model="newPassword" type="password" minlength="8" required autocomplete="new-password" /></label><label>Konfirmasi password<input v-model="confirmPassword" type="password" minlength="8" required autocomplete="new-password" /></label><span v-if="message">{{ message }}</span><button class="primary-button" :disabled="saving">{{ saving ? 'Menyimpan…' : 'Perbarui Password' }}</button></form></div>
    <template v-else><div class="user-profile-grid"><div><small>Jenis akun</small><strong>{{ selected.user.account_type || selected.user.type }}</strong></div><div><small>NIK</small><strong>{{ selected.user.nik || '—' }}</strong></div><div><small>Telepon</small><strong>{{ selected.user.phone || '—' }}</strong></div><div><small>Alamat</small><strong>{{ selected.user.address || '—' }}</strong></div><div><small>Wilayah</small><strong>{{ [selected.user.subdistrict, selected.user.district, selected.user.city, selected.user.province, selected.user.postal_code].filter(Boolean).join(', ') || '—' }}</strong></div><div><small>Bank</small><strong>{{ selected.user.bank_name || '—' }} · {{ selected.user.bank_account_number || '—' }}</strong></div></div>
      <h3>Dokumen</h3><div class="user-documents"><article v-for="(available, field) in selected.documents" :key="field" :class="{ unavailable: !available }"><strong>{{ documentLabels[field as string] }}</strong><span>{{ available ? 'Tersedia' : 'Belum tersedia' }}</span><div v-if="available"><a :href="`/api/users/${selected.user.id}/documents/${field}`" target="_blank" rel="noopener">Preview</a><a :href="`/api/users/${selected.user.id}/documents/${field}?download=1`">Download</a></div></article></div>
      <section v-if="isAdmin" class="contract-generate"><h3>Kontrak Digital</h3><p>Buat kontrak dari template aktif dengan data user ini. Setelah dibuat, kirim melalui menu Kontrak Digital.</p><p v-if="contractMessage" class="user-save-message">{{ contractMessage }}</p><button class="primary-button" :disabled="contractBusy" @click="generateContract">{{ contractBusy ? 'Membuat…' : 'Generate Kontrak' }}</button></section>
      <section v-if="isAdmin" class="user-approval"><h3>Persetujuan User</h3><label>Status<select v-model="edit.status"><option value="Pending">Pending</option><option value="Review">Review</option><option value="Approved">Approved</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Rejected">Rejected</option><option value="Blocked">Blocked</option></select></label><label v-if="edit.status === 'Rejected'">Alasan penolakan *<textarea v-model="edit.rejectionReason" rows="3"></textarea></label><label v-if="edit.status === 'Blocked'">Alasan pemblokiran *<textarea v-model="edit.blockReason" rows="3"></textarea></label><div class="field-grid"><label>Persentase aggregator<input v-model.number="edit.aggregatorPercentage" type="number" min="0" max="100" step="0.01" /></label><label>Persentase publishing<input v-model.number="edit.publishingPercentage" type="number" min="0" max="100" step="0.01" /></label></div><p v-if="message" class="user-save-message">{{ message }}</p><button class="primary-button" :disabled="saving" @click="save">{{ saving ? 'Menyimpan…' : 'Simpan Perubahan' }}</button></section>
    </template></template></div></div>
  <div v-if="creating" class="modal-backdrop" @click.self="creating = false"><form class="modal staff-create-modal" @submit.prevent="createStaff"><button type="button" class="close" @click="creating = false">×</button><div class="eyebrow">AKUN STAF BARU</div><h2>Tambah Admin / Operator</h2><p>Form staf hanya berisi role, nama, email, dan password.</p><label>Role<select v-model="staffForm.role"><option value="Admin">Admin</option><option value="Operator">Operator</option></select></label><label>Nama<input v-model="staffForm.name" required maxlength="255" /></label><label>Email<input v-model="staffForm.email" type="email" required autocomplete="email" /></label><label>Password<input v-model="staffForm.password" type="password" required minlength="8" autocomplete="new-password" /></label><p v-if="staffMessage" class="alert error">{{ staffMessage }}</p><button class="primary-button" :disabled="staffSaving">{{ staffSaving ? 'Menyimpan…' : 'Buat Akun Staf' }}</button></form></div>
</template>
