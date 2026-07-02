<template>
  <div class="user-panel">
    <div class="panel-header">
      <h3>{{ $t('user.profile') }}</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <div class="panel-body" v-if="authStore.user">
      <!-- Profile Section -->
      <section class="panel-section">
        <div class="avatar-edit">
          <div class="current-avatar" :style="{ background: form.theme_color }">
            <img v-if="form.avatar_url" :src="form.avatar_url" alt="" />
            <span v-else>{{ (form.display_name || authStore.user.username)[0] }}</span>
          </div>
          <label class="upload-chip">
            <input type="file" accept="image/*" @change="uploadUserAvatar" />
            {{ uploadingAvatar ? $t('common.loading') : $t('user.uploadAvatar') }}
          </label>
        </div>
        
        <div class="form-group">
          <label>{{ $t('user.displayName') }}</label>
          <input v-model="form.display_name" type="text" />
        </div>
        
        <div class="form-group">
          <label>{{ $t('user.bio') }}</label>
          <textarea v-model="form.bio" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>{{ $t('user.themeColor') }}</label>
          <input v-model="form.theme_color" type="color" class="color-input" />
        </div>
        
        <div class="settings-list">
          <label class="switch-row">
            <span class="switch-copy">{{ $t('user.showOnHomepage') }}</span>
            <input class="switch-input" type="checkbox" v-model="form.show_on_homepage" />
            <span class="switch-track"><span class="switch-thumb"></span></span>
          </label>

          <label class="switch-row" :class="{ disabled: !form.show_on_homepage }">
            <span class="switch-copy">{{ $t('user.showHistory') }}</span>
            <input class="switch-input" type="checkbox" v-model="form.show_con_history" :disabled="!form.show_on_homepage" />
            <span class="switch-track"><span class="switch-thumb"></span></span>
          </label>

          <label class="switch-row">
            <span class="switch-copy">{{ $t('user.showHotel') }}</span>
            <input class="switch-input" type="checkbox" v-model="form.show_hotel_info" />
            <span class="switch-track"><span class="switch-thumb"></span></span>
          </label>
        </div>
        
        <button class="btn btn-primary btn-full" @click="saveProfile" :disabled="saving">
          {{ saving ? $t('common.loading') : (saved ? $t('user.saved') : $t('user.save')) }}
        </button>

        <button class="btn btn-outline btn-full export-btn" @click="exportCurrentUser">
          {{ $t('user.exportProfile') }}
        </button>
      </section>
      
      <!-- Con History Section -->
      <section class="panel-section">
        <h4>{{ $t('user.conHistory') }}</h4>
        <p class="history-hint">{{ $t('user.conHistoryHint') }}</p>
        
        <div class="my-cons">
          <article v-for="uc in userCons" :key="uc.id" class="my-con-item">
            <div class="my-con-main">
              <div class="my-con-info">
                <strong>{{ uc.Con?.name || 'Unknown' }}</strong>
                <span class="con-date">{{ uc.Con?.start_date }}</span>
                <span v-if="uc.comment" class="con-comment">{{ uc.comment }}</span>
                <span v-if="uc.Hotels?.length" class="con-hotels">
                  {{ $t('con.hotel') }}: {{ uc.Hotels.map(hotel => hotel.name).join(', ') }}
                </span>
              </div>
              <div class="my-con-actions">
                <button class="link-btn compact" @click="toggleHistoryHotelEditor(uc)">
                  {{ hotelEditors[uc.id]?.open ? $t('common.close') : $t('hotel.editHotels') }}
                </button>
                <button class="remove-btn" @click="removeFromCon(uc.con_id)">×</button>
              </div>
            </div>

            <div v-if="hotelEditors[uc.id]?.open" class="history-hotel-editor">
              <label class="switch-row small">
                <span class="switch-copy">{{ $t('hotel.useVenue') }}</span>
                <input
                  class="switch-input"
                  type="checkbox"
                  :checked="hotelEditors[uc.id].useVenue"
                  @change="toggleVenueHotel(uc, $event.target.checked)"
                />
                <span class="switch-track"><span class="switch-thumb"></span></span>
              </label>

              <div v-for="(hotel, index) in hotelEditors[uc.id].hotels" :key="index" class="hotel-row history">
                <input v-model="hotel.name" :placeholder="$t('hotel.name')" />
                <input v-model="hotel.address" :placeholder="$t('hotel.address')" />
                <div class="form-row">
                  <input v-model="hotel.check_in" type="date" />
                  <input v-model="hotel.check_out" type="date" />
                </div>
                <button class="remove-hotel" @click="removeHistoryHotelRow(uc, index)">×</button>
              </div>

              <div class="history-hotel-actions">
                <button class="link-btn" @click="addHistoryHotelRow(uc)">+ {{ $t('con.addHotel') }}</button>
                <button class="btn btn-primary" @click="saveHistoryHotels(uc)" :disabled="savingHotelConId === uc.id">
                  {{ savingHotelConId === uc.id ? $t('common.loading') : $t('hotel.saveHotels') }}
                </button>
              </div>
            </div>
          </article>
        </div>
        
        <button class="btn btn-outline btn-full" @click="showAddCon = true">
          + {{ $t('con.addCon') }}
        </button>
      </section>
      
      <!-- Add Con Modal -->
      <div class="add-con-modal" v-if="showAddCon">
        <div class="modal-header">
          <h4>{{ $t('con.addCon') }}</h4>
          <button @click="showAddCon = false">×</button>
        </div>
        
        <div class="form-group">
          <label>{{ $t('common.search') }}</label>
          <input v-model="searchQuery" type="text" @input="searchCons" placeholder="Search cons..." />
        </div>
        
        <div class="search-results">
          <div 
            v-for="con in searchResults" 
            :key="con.id" 
            class="search-item"
            @click="selectConForAttendance(con)"
          >
            <span>{{ con.name }}</span>
            <span class="search-item-date">{{ con.start_date }}</span>
          </div>
        </div>

        <div class="attendance-form" v-if="selectedCon">
          <div class="selected-con">
            <strong>{{ selectedCon.name }}</strong>
            <button @click="selectedCon = null">×</button>
          </div>

          <div class="form-group">
            <label>{{ $t('con.comment') }}</label>
            <textarea v-model="attendanceForm.comment" rows="2"></textarea>
          </div>

          <div class="form-group">
            <label>{{ $t('con.rating') }}</label>
            <select v-model="attendanceForm.rating">
              <option :value="null">-</option>
              <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">{{ score }}</option>
            </select>
          </div>

          <div class="hotel-editor">
            <div class="hotel-editor-head">
              <label>{{ $t('con.hotel') }}</label>
              <button class="link-btn" @click="addHotelRow">+ {{ $t('con.addHotel') }}</button>
            </div>
            <div v-for="(hotel, index) in attendanceForm.hotels" :key="index" class="hotel-row">
              <input v-model="hotel.name" :placeholder="$t('hotel.name')" />
              <input v-model="hotel.address" :placeholder="$t('hotel.address')" />
              <div class="form-row">
                <input v-model="hotel.check_in" type="date" />
                <input v-model="hotel.check_out" type="date" />
              </div>
              <button class="remove-hotel" @click="removeHotelRow(index)">×</button>
            </div>
          </div>

          <button class="btn btn-primary btn-full" @click="saveAttendance">
            {{ $t('common.save') }}
          </button>
        </div>
        
        <div class="divider"></div>
        <button class="btn btn-outline btn-full" @click="showSubmitCon = true">
          {{ $t('con.submitCon') }}
        </button>
      </div>
      
      <!-- Submit New Con Form -->
      <div class="submit-con-form" v-if="showSubmitCon">
        <h4>{{ $t('con.submitCon') }}</h4>
        <div class="form-group">
          <label>{{ $t('con.name') }} *</label>
          <input v-model="newCon.name" type="text" required />
        </div>
        <div class="form-group">
          <label>{{ $t('con.avatar') }}</label>
          <div class="upload-row">
            <div class="con-avatar-preview" :style="{ background: newCon.theme_color }">
              <img v-if="newConAvatarPreview" :src="newConAvatarPreview" alt="" />
              <span v-else>{{ newCon.name?.[0] || '?' }}</span>
            </div>
            <label class="upload-chip inline">
              <input type="file" accept="image/*" @change="selectNewConAvatar" />
              {{ uploadingConAvatar ? $t('common.loading') : $t('con.uploadAvatar') }}
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('con.startDate') }} *</label>
            <input v-model="newCon.start_date" type="date" required />
          </div>
          <div class="form-group">
            <label>{{ $t('con.endDate') }} *</label>
            <input v-model="newCon.end_date" type="date" required />
          </div>
        </div>
        <div class="form-group">
          <label>{{ $t('con.localName') }}</label>
          <input v-model="newCon.name_local" type="text" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('con.seriesKey') }}</label>
            <input v-model="newCon.series_key" type="text" />
          </div>
          <div class="form-group">
            <label>{{ $t('con.edition') }}</label>
            <input v-model="newCon.edition_label" type="text" />
          </div>
        </div>
        <div class="form-group">
          <label>{{ $t('con.venue') }}</label>
          <input v-model="newCon.venue" type="text" />
        </div>
        <div class="form-group">
          <label>{{ $t('hotel.address') }}</label>
          <input v-model="newCon.address" type="text" />
        </div>
        <div class="form-group">
          <label>{{ $t('con.city') }}</label>
          <input v-model="newCon.city" type="text" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('con.latitude') }}</label>
            <input v-model="newCon.latitude" type="number" step="0.0000001" />
          </div>
          <div class="form-group">
            <label>{{ $t('con.longitude') }}</label>
            <input v-model="newCon.longitude" type="number" step="0.0000001" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>{{ $t('con.theme') }}</label>
            <input v-model="newCon.theme" type="text" />
          </div>
          <div class="form-group">
            <label>{{ $t('user.themeColor') }}</label>
            <input v-model="newCon.theme_color" type="color" class="color-input" />
          </div>
        </div>
        <div class="form-group">
          <label>{{ $t('con.website') }}</label>
          <input v-model="newCon.website" type="url" />
        </div>
        <button class="btn btn-primary btn-full" @click="submitNewCon">
          {{ $t('common.confirm') }}
        </button>
      </div>
      
      <!-- Logout -->
      <section class="panel-section">
        <button class="btn btn-outline btn-full logout-btn" @click="handleLogout">
          {{ $t('nav.logout') }}
        </button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConsStore } from '@/stores/cons'
import api from '@/utils/api'

const emit = defineEmits(['close'])
const router = useRouter()
const authStore = useAuthStore()
const consStore = useConsStore()

const saving = ref(false)
const saved = ref(false)
const showAddCon = ref(false)
const showSubmitCon = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const userCons = ref([])
const selectedCon = ref(null)
const uploadingAvatar = ref(false)
const uploadingConAvatar = ref(false)
const newConAvatarFile = ref(null)
const newConAvatarPreview = ref('')
const hotelEditors = reactive({})
const savingHotelConId = ref('')

const form = reactive({
  display_name: authStore.user?.display_name || '',
  bio: authStore.user?.bio || '',
  theme_color: authStore.user?.theme_color || '#6C63FF',
  avatar_url: authStore.user?.avatar_url || '',
  show_on_homepage: authStore.user?.show_on_homepage ?? true,
  show_con_history: authStore.user?.show_con_history ?? true,
  show_hotel_info: authStore.user?.show_hotel_info ?? false,
})

const newCon = reactive({
  name: '', start_date: '', end_date: '', venue: '', city: '',
  name_local: '', series_key: '', series_name: '', edition_label: '',
  country: '中国', address: '', latitude: null, longitude: null,
  theme: '', theme_color: '#6C63FF', website: '',
})

const attendanceForm = reactive({
  comment: '',
  rating: null,
  hotels: [],
})

async function saveProfile() {
  saving.value = true
  try {
    const res = await authStore.updateProfile({
      ...form,
      show_con_history: form.show_on_homepage && form.show_con_history,
    })
    notifyProfileUpdated(res.user)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (error) {
    console.error('Save failed:', error)
  } finally {
    saving.value = false
  }
}

async function uploadUserAvatar(event) {
  const file = event.target.files?.[0]
  if (!file) return

  uploadingAvatar.value = true
  try {
    const body = new FormData()
    body.append('avatar', file)
    const res = await api.post('/auth/avatar', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    authStore.user = res.data.user
    form.avatar_url = res.data.user.avatar_url
    notifyProfileUpdated(res.data.user)
  } catch (error) {
    console.error('Avatar upload failed:', error)
  } finally {
    uploadingAvatar.value = false
    event.target.value = ''
  }
}

function notifyProfileUpdated(user = authStore.user) {
  window.dispatchEvent(new CustomEvent('pawport-profile-updated', { detail: { user } }))
}

function selectNewConAvatar(event) {
  const file = event.target.files?.[0]
  if (!file) return
  newConAvatarFile.value = file
  if (newConAvatarPreview.value) {
    URL.revokeObjectURL(newConAvatarPreview.value)
  }
  newConAvatarPreview.value = URL.createObjectURL(file)
}

async function uploadNewConAvatar(conId) {
  if (!newConAvatarFile.value) return null

  uploadingConAvatar.value = true
  try {
    const body = new FormData()
    body.append('avatar', newConAvatarFile.value)
    const res = await api.post(`/cons/${conId}/avatar`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.con
  } finally {
    uploadingConAvatar.value = false
  }
}

async function fetchUserCons() {
  try {
    const res = await api.get(`/users/${authStore.user.id}`)
    userCons.value = res.data.user.cons || []
    syncHotelEditors()
  } catch (error) {
    console.warn('Failed to fetch user cons')
  }
}

async function searchCons() {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }
  try {
    const res = await api.get('/cons', { params: { search: searchQuery.value } })
    searchResults.value = (res.data.cons || []).slice(0, 10)
  } catch (error) {
    searchResults.value = []
  }
}

async function addToCon(con) {
  await consStore.markAttendance(con.id, buildAttendancePayload())
  await fetchUserCons()
  showAddCon.value = false
  selectedCon.value = null
  await consStore.fetchMapCons()
}

function selectConForAttendance(con) {
  selectedCon.value = con
  attendanceForm.comment = ''
  attendanceForm.rating = null
  attendanceForm.hotels = []
}

function addHotelRow() {
  attendanceForm.hotels.push({
    ...buildVenueHotelRow(selectedCon.value),
    fromVenue: false,
  })
}

function buildVenueHotelRow(conLike) {
  const con = conLike?.Con || conLike || {}
  return {
    name: con.venue || '',
    address: con.address || '',
    city: con.city || selectedCon.value?.city || newCon.city || '',
    country: con.country || selectedCon.value?.country || newCon.country || '中国',
    latitude: con.latitude || null,
    longitude: con.longitude || null,
    check_in: con.start_date || '',
    check_out: con.end_date || '',
    notes: '',
    fromVenue: true,
  }
}

function removeHotelRow(index) {
  attendanceForm.hotels.splice(index, 1)
}

function buildAttendancePayload() {
  return {
    comment: attendanceForm.comment || undefined,
    rating: attendanceForm.rating || undefined,
    hotels: buildHotelPayload(attendanceForm.hotels, selectedCon.value),
  }
}

function buildHotelPayload(rows, conLike) {
  const con = conLike?.Con || conLike || {}
  return rows
    .filter(hotel => hotel.name)
    .map(hotel => ({
      name: hotel.name,
      address: hotel.address || undefined,
      city: hotel.city || con.city || undefined,
      country: hotel.country || con.country || undefined,
      latitude: hotel.latitude || undefined,
      longitude: hotel.longitude || undefined,
      check_in: hotel.check_in || undefined,
      check_out: hotel.check_out || undefined,
      notes: hotel.notes || undefined,
    }))
}

function hotelRowsFromVisit(visit) {
  return (visit.Hotels || []).map(hotel => ({
    name: hotel.name || '',
    address: hotel.address || '',
    city: hotel.city || visit.Con?.city || '',
    country: hotel.country || visit.Con?.country || '',
    latitude: hotel.latitude || null,
    longitude: hotel.longitude || null,
    check_in: hotel.UserConHotel?.check_in || '',
    check_out: hotel.UserConHotel?.check_out || '',
    notes: hotel.UserConHotel?.notes || '',
    fromVenue: false,
  }))
}

function createHotelEditor(visit) {
  return {
    open: false,
    useVenue: false,
    hotels: hotelRowsFromVisit(visit),
  }
}

function syncHotelEditors() {
  const currentIds = new Set(userCons.value.map(visit => visit.id))
  Object.keys(hotelEditors).forEach(id => {
    if (!currentIds.has(id)) delete hotelEditors[id]
  })

  userCons.value.forEach(visit => {
    if (!hotelEditors[visit.id]) {
      hotelEditors[visit.id] = createHotelEditor(visit)
      return
    }

    if (!hotelEditors[visit.id].open) {
      hotelEditors[visit.id].useVenue = false
      hotelEditors[visit.id].hotels = hotelRowsFromVisit(visit)
    }
  })
}

function ensureHotelEditor(visit) {
  if (!hotelEditors[visit.id]) {
    hotelEditors[visit.id] = createHotelEditor(visit)
  }
  return hotelEditors[visit.id]
}

function toggleHistoryHotelEditor(visit) {
  const editor = ensureHotelEditor(visit)
  editor.open = !editor.open
  if (editor.open && editor.hotels.length === 0) {
    editor.useVenue = false
  }
}

function toggleVenueHotel(visit, checked) {
  const editor = ensureHotelEditor(visit)
  editor.useVenue = checked
  if (checked) {
    const existingVenueRow = editor.hotels.some(hotel => hotel.fromVenue)
    if (!existingVenueRow) {
      editor.hotels.unshift(buildVenueHotelRow(visit))
    }
    return
  }

  editor.hotels = editor.hotels.filter(hotel => !hotel.fromVenue)
}

function addHistoryHotelRow(visit) {
  const editor = ensureHotelEditor(visit)
  editor.hotels.push({
    ...buildVenueHotelRow(visit),
    fromVenue: false,
  })
}

function removeHistoryHotelRow(visit, index) {
  const editor = ensureHotelEditor(visit)
  editor.hotels.splice(index, 1)
  editor.useVenue = editor.hotels.some(hotel => hotel.fromVenue)
}

async function saveHistoryHotels(visit) {
  const editor = ensureHotelEditor(visit)
  savingHotelConId.value = visit.id
  try {
    await consStore.markAttendance(visit.con_id, {
      comment: visit.comment || undefined,
      rating: visit.rating || undefined,
      hotels: buildHotelPayload(editor.hotels, visit),
    })
    editor.open = false
    await fetchUserCons()
    await consStore.fetchMapCons()
    window.dispatchEvent(new CustomEvent('pawport-attendance-updated', { detail: { conId: visit.con_id } }))
  } catch (error) {
    console.error('Failed to save hotels:', error)
  } finally {
    savingHotelConId.value = ''
  }
}

function buildExportPayload() {
  const profile = {
    username: authStore.user.username,
    email: authStore.user.email,
    phone: authStore.user.phone,
    display_name: form.display_name,
    avatar_url: form.avatar_url,
    theme_color: form.theme_color,
    bio: form.bio,
    show_on_homepage: form.show_on_homepage,
    show_con_history: form.show_con_history,
    show_hotel_info: form.show_hotel_info,
  }

  const attendances = [...userCons.value]
    .sort((a, b) => {
      const aTime = new Date(a.Con?.start_date || 0).getTime()
      const bTime = new Date(b.Con?.start_date || 0).getTime()
      if (aTime !== bTime) return aTime - bTime
      return (a.visit_order || 0) - (b.visit_order || 0)
    })
    .map(visit => ({
      comment: visit.comment,
      rating: visit.rating,
      visit_order: visit.visit_order,
      extra_fields: visit.extra_fields || {},
      con: {
        id: visit.Con?.id,
        name: visit.Con?.name,
        name_en: visit.Con?.name_en,
        start_date: visit.Con?.start_date,
        end_date: visit.Con?.end_date,
        venue: visit.Con?.venue,
        address: visit.Con?.address,
        city: visit.Con?.city,
        country: visit.Con?.country,
        latitude: visit.Con?.latitude,
        longitude: visit.Con?.longitude,
      },
      hotels: (visit.Hotels || []).map(hotel => ({
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        check_in: hotel.UserConHotel?.check_in,
        check_out: hotel.UserConHotel?.check_out,
        notes: hotel.UserConHotel?.notes,
      })),
    }))

  return {
    schema: 'pawport-user-export-v1',
    exported_at: new Date().toISOString(),
    restore_note: '测试阶段可用此文件手动恢复用户资料、参展记录、寄语评分与酒店信息。',
    profile,
    attendances,
  }
}

async function exportCurrentUser() {
  if (!authStore.user?.id) return
  await fetchUserCons()
  const payload = buildExportPayload()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `pawport-${authStore.user.username || 'user'}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function saveAttendance() {
  if (!selectedCon.value) return
  try {
    await addToCon(selectedCon.value)
  } catch (error) {
    console.error('Failed to add con:', error)
  }
}

async function removeFromCon(conId) {
  try {
    await consStore.removeAttendance(conId)
    await fetchUserCons()
    await consStore.fetchMapCons()
  } catch (error) {
    console.error('Failed to remove con:', error)
  }
}

async function submitNewCon() {
  try {
    let con = await consStore.submitCon(newCon)
    const uploadedCon = await uploadNewConAvatar(con.id)
    if (uploadedCon) {
      con = uploadedCon
    }
    showSubmitCon.value = false
    await consStore.markAttendance(con.id, buildAttendancePayload())
    await fetchUserCons()
    await consStore.fetchMapCons()
    showAddCon.value = false
    selectedCon.value = null
    newConAvatarFile.value = null
    if (newConAvatarPreview.value) {
      URL.revokeObjectURL(newConAvatarPreview.value)
      newConAvatarPreview.value = ''
    }
  } catch (error) {
    console.error('Failed to submit con:', error)
  }
}

function handleLogout() {
  authStore.logout()
  emit('close')
  router.push('/')
}

onMounted(() => {
  fetchUserCons()
})

watch(() => form.show_on_homepage, value => {
  if (!value) {
    form.show_con_history = false
  }
})
</script>

<style scoped lang="scss">
.user-panel {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  h3 { font-size: 1.2em; }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.3em;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    
    &:hover { background: var(--bg-secondary); }
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-section {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
  
  h4 {
    margin-bottom: 12px;
    color: var(--text-secondary);
    font-size: 0.9em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.avatar-edit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 16px;
  
  .current-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5em;
    font-weight: 700;
    overflow: hidden;
    
    img { width: 100%; height: 100%; object-fit: cover; }
  }
}

.upload-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  background: var(--bg);
  cursor: pointer;
  font-size: 0.82em;
  transition: border-color var(--transition), color var(--transition);

  &:hover {
    border-color: var(--user-primary, var(--primary));
    color: var(--user-primary, var(--primary));
  }

  input {
    display: none;
  }

  &.inline {
    flex: 1;
  }
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.con-avatar-preview {
  width: 56px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: white;
  font-weight: 700;
  border: 2px solid var(--border);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.form-group {
  margin-bottom: 12px;
  
  label {
    display: block;
    font-size: 0.85em;
    color: var(--text-secondary);
    margin-bottom: 4px;
    font-weight: 500;
  }
  
  input, textarea, select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 0.9em;
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    resize: vertical;
    
    &:focus {
      outline: none;
      border-color: var(--user-primary, var(--primary));
    }
  }
  
  .color-input {
    height: 40px;
    padding: 4px;
    cursor: pointer;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.9em;
    color: var(--text);
    
    input[type="checkbox"] {
      width: auto;
    }
  }
}

.form-row {
  display: flex;
  gap: 12px;
  
  .form-group { flex: 1; }
}

.settings-list {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: border-color var(--transition), opacity var(--transition), background var(--transition);

  &.small {
    min-height: 36px;
    padding: 6px 8px;
    background: var(--bg);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.switch-copy {
  min-width: 0;
  color: var(--text);
  font-size: 0.88em;
  font-weight: 600;
}

.switch-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--border);
  border: 1px solid var(--border);
  transition: background var(--transition), border-color var(--transition);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-card);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
  transition: transform var(--transition);
}

.switch-input:checked + .switch-track {
  background: var(--user-primary, var(--primary));
  border-color: var(--user-primary, var(--primary));
}

.switch-input:checked + .switch-track .switch-thumb {
  transform: translateX(20px);
}

.switch-input:disabled + .switch-track {
  opacity: 0.6;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.9em;
  font-weight: 700;
  transition: all var(--transition);
}

.btn-full {
  width: 100%;
  padding: 10px;
}

.btn-primary {
  background: var(--user-primary, var(--primary));
  border-color: var(--user-primary, var(--primary));
  color: white;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--user-primary, var(--primary)) 22%, transparent);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 28px color-mix(in srgb, var(--user-primary, var(--primary)) 28%, transparent);
  }

  &:disabled {
    cursor: default;
    opacity: 0.65;
    transform: none;
    box-shadow: none;
  }
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  
  &:hover { border-color: var(--user-primary, var(--primary)); color: var(--user-primary, var(--primary)); }
}

.my-cons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.history-hint {
  margin: -4px 0 12px;
  color: var(--text-secondary);
  font-size: 0.82em;
  line-height: 1.45;
}

.my-con-item {
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);

  .my-con-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  
  .my-con-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    strong { font-size: 0.9em; }
    .con-date { font-size: 0.8em; color: var(--text-secondary); }
    .con-comment,
    .con-hotels {
      color: var(--text-secondary);
      font-size: 0.8em;
      line-height: 1.35;
    }
  }

  .my-con-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
  }
  
  .remove-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    
    &:hover { background: #FEE; color: #E53E3E; }
  }
}

.history-hotel-editor {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.hotel-row.history {
  background: var(--bg);
}

.history-hotel-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  .btn {
    min-height: 32px;
    padding: 6px 12px;
    font-size: 0.82em;
  }
}

.add-con-modal, .submit-con-form {
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-top: 12px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1em;
    color: var(--text-secondary);
  }
}

.search-results {
  max-height: 200px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
  
  &:hover { background: var(--bg-card); }
  
  .search-item-date {
    font-size: 0.8em;
    color: var(--text-secondary);
  }
}

.attendance-form {
  margin-top: 14px;
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.selected-con,
.hotel-editor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.selected-con button,
.link-btn,
.remove-hotel {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 4px 6px;
}

.link-btn {
  color: var(--user-primary, var(--primary));
  font-weight: 600;
}

.link-btn.compact {
  font-size: 0.78em;
  white-space: nowrap;
}

.hotel-editor {
  margin-bottom: 12px;
}

.hotel-row {
  display: grid;
  gap: 8px;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  position: relative;
}

.remove-hotel {
  position: absolute;
  top: 4px;
  right: 4px;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}

.logout-btn {
  color: #E53E3E;
  border-color: #E53E3E;
  
  &:hover { background: #FEE; }
}
</style>
