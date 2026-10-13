export interface CmsUser { id: number; name: string; email: string; role: string; status: string }
export interface Release { id: number; user_id: number; title: string; type: string; status: string; upc: string | null; planned_release_date: string | null; cover_art?: string | null; cover_url?: string | null; owner_name?: string }
export interface CmsAccount { id: number; full_name: string | null; company_name?: string | null; username?: string; email: string; role: string; status: string; type: string }
export interface Page<T> { data: T[]; current_page: number; last_page: number; total: number }

let csrfToken = ''

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  if (method !== 'GET' && !csrfToken) {
    const response = await fetch('/api/csrf', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error('Sesi tidak tersedia. Muat ulang halaman.')
    csrfToken = (await response.json()).token
  }
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (method !== 'GET') headers.set('X-CSRF-TOKEN', csrfToken)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(url, { ...init, headers, credentials: 'same-origin' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 419) csrfToken = ''
    const message = data.error || data.message || (data.errors && Object.values(data.errors).flat().join(', ')) || `Permintaan gagal (${response.status})`
    throw new Error(message)
  }
  return data as T
}
