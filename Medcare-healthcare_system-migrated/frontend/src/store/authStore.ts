import { create } from 'zustand'

interface AuthState {
  token: string | null
  role: string | null
  name: string | null
  userId: number | null
  setAuth: (token: string, role: string, name: string, userId: number) => void
  clearAuth: () => void
  getToken: () => string | null
  getUserId: () => number
  isAdmin: () => boolean
  isDoctor: () => boolean
  isPatient: () => boolean
}

const ss = {
  get: (key: string) => sessionStorage.getItem(key),
  set: (key: string, val: string) => sessionStorage.setItem(key, val),
  clear: () => sessionStorage.clear(),
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: ss.get('token'),
  role: ss.get('role'),
  name: ss.get('name'),
  userId: Number(ss.get('userId')) || null,

  setAuth: (token, role, name, userId) => {
    ss.set('token', token)
    ss.set('role', role)
    ss.set('name', name)
    ss.set('userId', String(userId))
    set({ token, role, name, userId })
  },

  clearAuth: () => {
    ss.clear()
    set({ token: null, role: null, name: null, userId: null })
  },

  getToken: () => get().token ?? ss.get('token'),
  getUserId: () => get().userId ?? Number(ss.get('userId')) ?? 0,
  isAdmin: () => (get().role ?? ss.get('role')) === 'ADMIN',
  isDoctor: () => (get().role ?? ss.get('role')) === 'DOCTOR',
  isPatient: () => (get().role ?? ss.get('role')) === 'PATIENT',
}))
