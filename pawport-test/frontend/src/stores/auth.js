import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('pawport-token') || null)
  
  const isLoggedIn = computed(() => !!token.value)
  const themeColor = computed(() => user.value?.theme_color || '#6C63FF')
  
  async function login(login, password) {
    const res = await api.post('/auth/login', { login, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('pawport-token', res.data.token)
    return res.data
  }
  
  async function register(data) {
    const res = await api.post('/auth/register', data)
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('pawport-token', res.data.token)
    return res.data
  }
  
  async function fetchProfile() {
    if (!token.value) return
    try {
      const res = await api.get('/auth/me')
      user.value = res.data.user
    } catch (error) {
      if (error.response?.status === 401) {
        logout()
      }
    }
  }
  
  async function updateProfile(data) {
    const res = await api.put('/auth/profile', data)
    user.value = res.data.user
    return res.data
  }
  
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('pawport-token')
  }
  
  return { user, token, isLoggedIn, themeColor, login, register, fetchProfile, updateProfile, logout }
})
