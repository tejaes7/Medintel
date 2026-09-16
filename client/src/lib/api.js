/**
 * The single HTTP boundary between the React SPA and the API/Gateway layer.
 *
 * Presentation-layer rule from the architecture: the client talks to /api and knows
 * nothing beneath it. There is no database, no provider name and no model id in here.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

const ACCESS_KEY = 'medintel.accessToken'
const REFRESH_KEY = 'medintel.refreshToken'

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** Errors carry the server's machine code so components can branch without parsing strings. */
export class ApiError extends Error {
  constructor({ status, code, message, details, requestId }) {
    super(message ?? 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

let refreshing = null

/** Refreshes once and lets every queued 401 retry share the same in-flight promise. */
async function refreshAccessToken() {
  if (refreshing) return refreshing

  refreshing = (async () => {
    const refreshToken = tokens.refresh
    if (!refreshToken) return false
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        tokens.clear()
        return false
      }
      tokens.set(json.data.tokens)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

async function request(method, path, { body, isForm = false, retry = true } = {}) {
  const headers = {}
  const access = tokens.access
  if (access) headers.Authorization = `Bearer ${access}`
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    })
  } catch (err) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError'
    throw new ApiError({
      status: 0,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: isTimeout
        ? 'The request timed out. If the backend is on Render free tier, it may take ~45 seconds to wake up from sleep — please try again.'
        : 'Cannot reach the MedIntel API. Is the server running?',
    })
  }

  // A 204 has no body to parse.
  const json = res.status === 204 ? { ok: true, data: null } : await res.json().catch(() => null)

  if (!json) {
    throw new ApiError({ status: res.status, code: 'BAD_RESPONSE', message: 'The server returned an unreadable response' })
  }

  if (!json.ok) {
    // One transparent retry after refreshing an expired access token.
    if (res.status === 401 && retry && json.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshAccessToken()
      if (refreshed) return request(method, path, { body, isForm, retry: false })
    }
    throw new ApiError({
      status: res.status,
      code: json.error?.code,
      message: json.error?.message,
      details: json.error?.details,
      requestId: json.meta?.requestId,
    })
  }

  return { data: json.data, meta: json.meta }
}

const get = (path) => request('GET', path)
const post = (path, body) => request('POST', path, { body })
const patch = (path, body) => request('PATCH', path, { body })
const del = (path) => request('DELETE', path)

export const api = {
  health: () => get('/api/health'),

  auth: {
    register: (payload) => post('/api/auth/register', payload),
    login: (payload) => post('/api/auth/login', payload),
    logout: () => post('/api/auth/logout'),
    me: () => get('/api/auth/me'),
  },

  triage: {
    rules: () => get('/api/triage/rules'),
    analyse: (payload) => post('/api/triage/analyse', payload),
    sessions: ({ limit = 20, skip = 0 } = {}) => get(`/api/triage/sessions?limit=${limit}&skip=${skip}`),
    latest: () => get('/api/triage/sessions/latest'),
    session: (id) => get(`/api/triage/sessions/${id}`),
  },

  chat: {
    conversations: () => get('/api/chat/conversations'),
    start: () => post('/api/chat/conversations'),
    latest: () => get('/api/chat/conversations/latest'),
    conversation: (id) => get(`/api/chat/conversations/${id}`),
    send: ({ message, conversationId }) =>
      post('/api/chat/messages', { message, ...(conversationId ? { conversationId } : {}) }),
  },

  reports: {
    list: () => get('/api/reports'),
    get: (id) => get(`/api/reports/${id}`),
    remove: (id) => del(`/api/reports/${id}`),
    upload: ({ file, name, lab, reportDate }) => {
      const form = new FormData()
      form.append('file', file)
      if (name) form.append('name', name)
      if (lab) form.append('lab', lab)
      if (reportDate) form.append('reportDate', reportDate)
      return request('POST', '/api/reports', { body: form, isForm: true })
    },
  },

  reminders: {
    list: () => get('/api/reminders'),
    create: (payload) => post('/api/reminders', payload),
    update: (id, patchBody) => patch(`/api/reminders/${id}`, patchBody),
    remove: (id) => del(`/api/reminders/${id}`),
    acknowledge: (id, doseId, status) => post(`/api/reminders/${id}/doses/${doseId}`, { status }),
  },

  hospitals: {
    search: ({ city = '', department = '', name = '', lat = '', lng = '', limit = 20, skip = 0 } = {}) =>
      get(`/api/hospitals?city=${encodeURIComponent(city)}&department=${encodeURIComponent(department)}&name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&limit=${limit}&skip=${skip}`),
    getDetails: (id) => get(`/api/hospitals/${id}`),
    upcomingEvents: () => get('/api/hospitals/events/upcoming'),
    myAppointments: () => get('/api/hospitals/appointments/my'),
    bookAppointment: (payload) => post('/api/hospitals/appointments', payload),
    cancelAppointment: (id) => patch(`/api/hospitals/appointments/${id}/cancel`),
    myProfile: () => get('/api/hospitals/my-profile'),
    updateMyProfile: (payload) => post('/api/hospitals/my-profile', payload),
    addDoctor: (payload) => post('/api/hospitals/doctors', payload),
    deleteDoctor: (id) => del(`/api/hospitals/doctors/${id}`),
    addEvent: (payload) => post('/api/hospitals/events', payload),
    deleteEvent: (id) => del(`/api/hospitals/events/${id}`),
    managedAppointments: () => get('/api/hospitals/manage/appointments'),
    updateAppointmentStatus: (id, status) => patch(`/api/hospitals/manage/appointments/${id}`, { status }),
  },

  history: ({ limit = 50, skip = 0, kind } = {}) =>
    get(`/api/history?limit=${limit}&skip=${skip}${kind ? `&kind=${kind}` : ''}`),

  profile: {
    get: () => get('/api/profile'),
    update: (payload) => patch('/api/profile', payload),
  },

  dashboard: () => get('/api/dashboard'),
}
