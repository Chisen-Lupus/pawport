import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/utils/api'

export const useConsStore = defineStore('cons', () => {
  const cons = ref([])
  const mapCons = ref([])
  const currentCon = ref(null)
  const loading = ref(false)
  
  async function fetchMapCons() {
    loading.value = true
    try {
      const res = await api.get('/cons/map')
      mapCons.value = res.data.cons
    } finally {
      loading.value = false
    }
  }
  
  async function fetchCons(params = {}) {
    loading.value = true
    try {
      const res = await api.get('/cons', { params })
      cons.value = res.data.cons
    } finally {
      loading.value = false
    }
  }
  
  async function fetchCon(id) {
    const res = await api.get(`/cons/${id}`)
    currentCon.value = res.data.con
    return res.data.con
  }
  
  async function fetchAttendees(conId) {
    const res = await api.get(`/cons/${conId}/attendees`)
    return res.data
  }
  
  async function markAttendance(conId, data) {
    const res = await api.post(`/cons/${conId}/attend`, data)
    return res.data
  }
  
  async function removeAttendance(conId) {
    const res = await api.delete(`/cons/${conId}/attend`)
    return res.data
  }
  
  async function submitCon(data) {
    const res = await api.post('/cons', data)
    return res.data.con
  }
  
  return { cons, mapCons, currentCon, loading, fetchMapCons, fetchCons, fetchCon, fetchAttendees, markAttendance, removeAttendance, submitCon }
})
