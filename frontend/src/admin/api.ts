const TOKEN_KEY = 'blog_admin_token'

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) ?? ''
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const BASE = import.meta.env.BASE_URL

export async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE}api${path}`, {
    ...opts,
    headers: {
      ...(opts.body && !(opts.body instanceof Blob) && !(opts.body instanceof File)
        ? { 'Content-Type': 'application/json' }
        : {}),
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers ?? {}),
    },
  })
  if (res.status === 401) {
    clearToken()
    location.href = `${BASE}admin/login`
    throw new Error('unauthorized')
  }
  return res
}

export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${BASE}api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) return false
  setToken((await res.json()).token)
  return true
}

export async function checkToken(): Promise<boolean> {
  if (!getToken()) return false
  try {
    const res = await api('/admin/check')
    return res.ok
  } catch {
    return false
  }
}
