<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { api } from '../api'

const form = reactive({
  accountType: 'PERSONAL', fullName: '', companyName: '', email: '', password: '', phone: '', nik: '',
  address: '', country: 'Indonesia', province: '', city: '', district: '', subdistrict: '', postalCode: '',
  picName: '', picPosition: '', picPhone: '', bankName: '', bankAccountNumber: '', bankAccountName: '',
  ktpDocPath: '', npwpDocPath: '', signatureDocPath: '', nibDocPath: '', kemenkumhamDocPath: '',
})
type DocumentKey = 'ktpDocPath' | 'npwpDocPath' | 'signatureDocPath' | 'nibDocPath' | 'kemenkumhamDocPath'
const documentFields: { field: DocumentKey; type: string; label: string }[] = [
  { field: 'ktpDocPath', type: 'ktp', label: 'KTP' }, { field: 'npwpDocPath', type: 'npwp', label: 'NPWP' },
  { field: 'signatureDocPath', type: 'signature', label: 'Tanda tangan' }, { field: 'nibDocPath', type: 'nib', label: 'NIB' },
  { field: 'kemenkumhamDocPath', type: 'kemenkumham', label: 'Kemenkumham' },
]
const busy = ref(false), uploaded = ref(''), error = ref(''), success = ref(false)
type RegionItem = { code: string; name: string }
const provinces = ref<RegionItem[]>([]), cities = ref<RegionItem[]>([]), districts = ref<RegionItem[]>([]), villages = ref<RegionItem[]>([])
const provinceCode = ref(''), cityCode = ref(''), districtCode = ref(''), villageCode = ref('')
const regionLoading = ref(false), postalLoading = ref(false), regionError = ref(''), postalError = ref('')
async function getRegions(url: string): Promise<RegionItem[]> {
  return (await api<{ data: RegionItem[] }>(url)).data
}
onMounted(async () => {
  try { regionLoading.value = true; provinces.value = await getRegions('/api/wilayah/provinces') }
  catch (reason) { regionError.value = (reason as Error).message }
  finally { regionLoading.value = false }
})
watch(provinceCode, async (code) => {
  form.province = provinces.value.find(item => item.code === code)?.name || ''
  cityCode.value = ''; districtCode.value = ''; villageCode.value = ''; cities.value = []; districts.value = []; villages.value = []; form.city = ''; form.district = ''; form.subdistrict = ''; form.postalCode = ''
  if (!code) return
  try { regionLoading.value = true; regionError.value = ''; cities.value = await getRegions(`/api/wilayah/regencies/${code}`) }
  catch (reason) { regionError.value = (reason as Error).message }
  finally { regionLoading.value = false }
})
watch(cityCode, async (code) => {
  form.city = cities.value.find(item => item.code === code)?.name || ''
  districtCode.value = ''; villageCode.value = ''; districts.value = []; villages.value = []; form.district = ''; form.subdistrict = ''; form.postalCode = ''
  if (!code) return
  try { regionLoading.value = true; regionError.value = ''; districts.value = await getRegions(`/api/wilayah/districts/${code}`) }
  catch (reason) { regionError.value = (reason as Error).message }
  finally { regionLoading.value = false }
})
watch(districtCode, async (code) => {
  form.district = districts.value.find(item => item.code === code)?.name || ''
  villageCode.value = ''; villages.value = []; form.subdistrict = ''; form.postalCode = ''
  if (!code) return
  try { regionLoading.value = true; regionError.value = ''; villages.value = await getRegions(`/api/wilayah/villages/${code}`) }
  catch (reason) { regionError.value = (reason as Error).message }
  finally { regionLoading.value = false }
})
watch(villageCode, async (code) => {
  form.subdistrict = villages.value.find(item => item.code === code)?.name || ''
  form.postalCode = ''; postalError.value = ''
  if (!code) return
  try {
    postalLoading.value = true
    const query = new URLSearchParams({ province: form.province, city: form.city, district: form.district, village: form.subdistrict })
    const result = await api<{ code: string }>(`/api/wilayah/postal-code?${query}`)
    form.postalCode = result.code
    if (!result.code) postalError.value = 'Kode pos tidak ditemukan otomatis. Silakan isi manual.'
  } catch { postalError.value = 'Kode pos tidak ditemukan otomatis. Silakan isi manual.' }
  finally { postalLoading.value = false }
})
async function upload(event: Event, field: DocumentKey, type: string) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''; busy.value = true; uploaded.value = type
  try {
    const body = new FormData(); body.append('type', type); body.append('file', file)
    form[field] = (await api<{ path: string }>('/api/users/upload-doc', { method: 'POST', body })).path
  } catch (reason) { error.value = (reason as Error).message; form[field] = '' }
  finally { busy.value = false; uploaded.value = '' }
}
async function submit() {
  error.value = ''; busy.value = true
  try {
    await api('/api/auth/register', { method: 'POST', body: JSON.stringify(form) })
    success.value = true
  } catch (reason) { error.value = (reason as Error).message }
  finally { busy.value = false }
}
</script>

<template>
  <section class="registration">
    <div v-if="success" class="panel success-panel"><div class="success-icon">✓</div><h1>Pendaftaran diterima</h1><p>Akun Anda menunggu persetujuan admin. Silakan masuk setelah akun diaktifkan.</p><RouterLink to="/login" class="primary-button">Kembali ke login</RouterLink></div>
    <template v-else>
      <div class="page-heading"><div><div class="eyebrow">AKUN BARU</div><h1>Daftar di Dimensi Suara</h1><p>Isi data dan unggah dokumen untuk proses verifikasi.</p></div></div>
      <form @submit.prevent="submit" class="registration-form">
        <section class="panel"><h2>Jenis akun & identitas</h2><div class="field-grid">
          <label>Jenis akun<select v-model="form.accountType"><option value="PERSONAL">Personal</option><option value="COMPANY">Perusahaan</option></select></label>
          <label>Nama lengkap<input v-model="form.fullName" required /></label>
          <label v-if="form.accountType === 'COMPANY'">Nama perusahaan<input v-model="form.companyName" required /></label>
          <label>NIK<input v-model="form.nik" /></label>
          <label>Email<input v-model="form.email" type="email" required autocomplete="email" /></label>
          <label>Password (minimal 8 karakter)<input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" /></label>
          <label>Nomor handphone<input v-model="form.phone" type="tel" /></label>
        </div></section>
        <section class="panel"><h2>Alamat & pembayaran</h2><div class="field-grid">
          <label class="wide">Alamat lengkap<textarea v-model="form.address" rows="2" /></label>
          <label>Negara<select v-model="form.country"><option value="Indonesia">Indonesia</option><option value="Lainnya">Negara lainnya</option></select></label>
          <template v-if="form.country === 'Indonesia'">
            <label>Provinsi *<select v-model="provinceCode" required :disabled="regionLoading && !provinces.length"><option value="">{{ regionLoading && !provinces.length ? 'Memuat provinsi…' : 'Pilih provinsi' }}</option><option v-for="item in provinces" :key="item.code" :value="item.code">{{ item.name }}</option></select></label>
            <label>Kota / Kabupaten *<select v-model="cityCode" required :disabled="!provinceCode || regionLoading"><option value="">{{ !provinceCode ? 'Pilih provinsi dahulu' : 'Pilih kota / kabupaten' }}</option><option v-for="item in cities" :key="item.code" :value="item.code">{{ item.name }}</option></select></label>
            <label>Kecamatan *<select v-model="districtCode" required :disabled="!cityCode || regionLoading"><option value="">{{ !cityCode ? 'Pilih kota dahulu' : 'Pilih kecamatan' }}</option><option v-for="item in districts" :key="item.code" :value="item.code">{{ item.name }}</option></select></label>
            <label>Kelurahan *<select v-model="villageCode" required :disabled="!districtCode || regionLoading"><option value="">{{ !districtCode ? 'Pilih kecamatan dahulu' : 'Pilih kelurahan' }}</option><option v-for="item in villages" :key="item.code" :value="item.code">{{ item.name }}</option></select></label>
            <label>Kode pos *<input v-model="form.postalCode" required inputmode="numeric" maxlength="10" :readonly="Boolean(villageCode) && !postalError" :placeholder="postalLoading ? 'Mencari kode pos…' : 'Kode pos otomatis'" /><small v-if="postalError" class="field-error">{{ postalError }}</small></label>
            <p v-if="regionError" class="alert error wide" role="alert">{{ regionError }}</p>
          </template>
          <template v-else><label>Provinsi<input v-model="form.province" /></label><label>Kota<input v-model="form.city" /></label><label>Wilayah<input v-model="form.district" /></label><label>Kode pos<input v-model="form.postalCode" /></label></template>
          <label>Nama bank<input v-model="form.bankName" /></label><label>Nomor rekening<input v-model="form.bankAccountNumber" /></label>
          <label>Nama pemilik rekening<input v-model="form.bankAccountName" /></label>
          <template v-if="form.accountType === 'COMPANY'"><label>Nama PIC<input v-model="form.picName" /></label><label>Jabatan PIC<input v-model="form.picPosition" /></label><label>Telepon PIC<input v-model="form.picPhone" /></label></template>
        </div></section>
        <section class="panel"><h2>Dokumen verifikasi</h2><p>JPG, PNG, WEBP, atau PDF maksimal 10 MB. Dokumen Kemenkumham harus PDF.</p><div class="doc-grid">
          <label v-for="doc in documentFields.filter(item => form.accountType === 'COMPANY' || !['nib', 'kemenkumham'].includes(item.type))" :key="doc.type" class="upload-card">
            <strong>{{ doc.label }} *</strong><span>{{ uploaded === doc.type ? 'Mengunggah…' : form[doc.field] ? '✓ Terunggah' : 'Pilih file' }}</span>
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" :disabled="busy" @change="upload($event, doc.field, doc.type)" />
          </label>
        </div></section>
        <p v-if="error" class="alert error" role="alert">{{ error }}</p>
        <button class="primary-button" :disabled="busy">{{ busy ? 'Memproses…' : 'Kirim pendaftaran' }}</button>
        <p>Sudah punya akun? <RouterLink to="/login">Masuk</RouterLink></p>
      </form>
    </template>
  </section>
</template>
