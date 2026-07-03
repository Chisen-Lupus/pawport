<template>
  <div class="admin-page">
    <section class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="admin-kicker">{{ $t('admin.kicker') }}</p>
          <h2>{{ $t('admin.title') }}</h2>
          <p>{{ $t('admin.subtitle') }}</p>
        </div>
        <button class="btn btn-primary" type="button" @click="fetchReviewCons" :disabled="loading || !canReview">
          {{ loading ? $t('common.loading') : $t('admin.refresh') }}
        </button>
      </header>

      <div v-if="profileLoading" class="admin-state">{{ $t('common.loading') }}</div>
      <div v-else-if="!authStore.isLoggedIn" class="admin-state">
        <p>{{ $t('admin.loginRequired') }}</p>
        <RouterLink class="btn btn-primary" to="/login">{{ $t('nav.login') }}</RouterLink>
      </div>
      <div v-else-if="authStore.user?.role !== 'admin'" class="admin-state">
        <p>{{ $t('admin.forbidden') }}</p>
      </div>

      <template v-else>
        <div class="admin-toolbar">
          <label>
            <span>{{ $t('admin.statusFilter') }}</span>
            <select v-model="statusFilter" @change="fetchReviewCons">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="admin-search">
            <span>{{ $t('common.search') }}</span>
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="$t('admin.searchPlaceholder')"
              @keyup.enter="fetchReviewCons"
            />
          </label>

          <button class="btn btn-outline" type="button" @click="fetchReviewCons">
            {{ $t('common.search') }}
          </button>
        </div>

        <p v-if="message" class="admin-message success">{{ message }}</p>
        <p v-if="error" class="admin-message error">{{ error }}</p>

        <div v-if="loading" class="admin-state">{{ $t('common.loading') }}</div>
        <div v-else-if="!reviewCons.length" class="admin-state">{{ $t('admin.empty') }}</div>

        <div v-else class="review-list">
          <article v-for="con in reviewCons" :key="con.id" class="review-card">
            <div class="review-card-head">
              <div>
                <span class="status-badge" :class="`status-${con.status}`">
                  {{ $t(`admin.status.${con.status}`) }}
                </span>
                <h3>{{ con.name }}</h3>
                <p>
                  {{ formatDate(con.start_date) }} - {{ formatDate(con.end_date) }}
                  <span v-if="con.submitted_by_user">
                    · {{ $t('admin.submittedBy') }} {{ displayName(con.submitted_by_user) }}
                  </span>
                </p>
              </div>
              <small>{{ formatDateTime(con.created_at) }}</small>
            </div>

            <div v-if="drafts[con.id]" class="review-form">
              <label class="field wide">
                <span>{{ $t('con.name') }}</span>
                <input v-model="drafts[con.id].name" type="text" />
              </label>

              <label class="field">
                <span>{{ $t('con.startDate') }}</span>
                <input v-model="drafts[con.id].start_date" type="date" />
              </label>
              <label class="field">
                <span>{{ $t('con.endDate') }}</span>
                <input v-model="drafts[con.id].end_date" type="date" />
              </label>

              <label class="field">
                <span>{{ $t('con.seriesKey') }}</span>
                <input v-model="drafts[con.id].series_key" type="text" />
              </label>
              <label class="field">
                <span>{{ $t('admin.seriesName') }}</span>
                <input v-model="drafts[con.id].series_name" type="text" />
              </label>
              <label class="field">
                <span>{{ $t('con.edition') }}</span>
                <input v-model="drafts[con.id].edition_label" type="text" />
              </label>

              <label class="field">
                <span>{{ $t('con.venue') }}</span>
                <input v-model="drafts[con.id].venue" type="text" />
              </label>
              <label class="field wide">
                <span>{{ $t('hotel.address') }}</span>
                <input v-model="drafts[con.id].address" type="text" />
              </label>

              <label class="field">
                <span>{{ $t('con.city') }}</span>
                <input v-model="drafts[con.id].city" type="text" />
              </label>
              <label class="field">
                <span>{{ $t('hotel.country') }}</span>
                <input v-model="drafts[con.id].country" type="text" />
              </label>
              <label class="field">
                <span>{{ $t('con.latitude') }}</span>
                <input v-model="drafts[con.id].latitude" type="number" step="0.0000001" />
              </label>
              <label class="field">
                <span>{{ $t('con.longitude') }}</span>
                <input v-model="drafts[con.id].longitude" type="number" step="0.0000001" />
              </label>

              <label class="field wide">
                <span>{{ $t('con.website') }}</span>
                <input v-model="drafts[con.id].website" type="url" />
              </label>

              <p v-if="coordinateWarning(drafts[con.id])" class="coordinate-warning">
                {{ coordinateWarning(drafts[con.id]) }}
              </p>
            </div>

            <div class="review-actions">
              <button
                class="btn btn-outline"
                type="button"
                @click="saveCon(con)"
                :disabled="savingId === con.id"
              >
                {{ $t('common.save') }}
              </button>
              <button
                class="btn approve-btn"
                type="button"
                @click="approveCon(con)"
                :disabled="savingId === con.id"
              >
                {{ $t('admin.approve') }}
              </button>
              <button
                class="btn reject-btn"
                type="button"
                @click="rejectCon(con)"
                :disabled="savingId === con.id"
              >
                {{ $t('admin.reject') }}
              </button>
            </div>
          </article>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const { t, locale } = useI18n()
const authStore = useAuthStore()

const profileLoading = ref(false)
const loading = ref(false)
const savingId = ref('')
const statusFilter = ref('pending')
const searchQuery = ref('')
const reviewCons = ref([])
const drafts = reactive({})
const message = ref('')
const error = ref('')

const canReview = computed(() => authStore.isLoggedIn && authStore.user?.role === 'admin')
const statusOptions = computed(() => [
  { value: 'pending', label: t('admin.status.pending') },
  { value: 'approved', label: t('admin.status.approved') },
  { value: 'rejected', label: t('admin.status.rejected') },
  { value: 'all', label: t('admin.status.all') },
])

function displayName(user) {
  return user?.display_name || user?.username || ''
}

function formatDate(value) {
  if (!value) return ''
  return new Date(`${value}T00:00:00`).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US')
}

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US')
}

function createDraft(con) {
  return {
    name: con.name || '',
    start_date: con.start_date || '',
    end_date: con.end_date || '',
    series_key: con.series_key || '',
    series_name: con.series_name || '',
    edition_label: con.edition_label || '',
    venue: con.venue || '',
    address: con.address || '',
    city: con.city || '',
    country: con.country || '',
    latitude: con.latitude ?? '',
    longitude: con.longitude ?? '',
    website: con.website || '',
  }
}

function syncDrafts(cons) {
  const nextIds = new Set(cons.map(con => con.id))
  Object.keys(drafts).forEach(id => {
    if (!nextIds.has(id)) delete drafts[id]
  })

  cons.forEach(con => {
    drafts[con.id] = createDraft(con)
  })
}

async function fetchReviewCons() {
  if (!canReview.value) return

  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/cons/admin/review', {
      params: {
        status: statusFilter.value,
        search: searchQuery.value || undefined,
      },
    })
    reviewCons.value = res.data.cons || []
    syncDrafts(reviewCons.value)
  } catch (err) {
    error.value = t('admin.loadFailed')
    reviewCons.value = []
  } finally {
    loading.value = false
  }
}

function cleanOptional(value) {
  const cleaned = String(value ?? '').trim()
  return cleaned || null
}

function cleanCoordinate(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function buildPayload(con, status = null) {
  const draft = drafts[con.id]
  const payload = {
    name: cleanOptional(draft.name) || con.name,
    start_date: draft.start_date || con.start_date,
    end_date: draft.end_date || con.end_date,
    series_key: cleanOptional(draft.series_key),
    series_name: cleanOptional(draft.series_name),
    edition_label: cleanOptional(draft.edition_label),
    venue: cleanOptional(draft.venue),
    address: cleanOptional(draft.address),
    city: cleanOptional(draft.city),
    country: cleanOptional(draft.country),
    latitude: cleanCoordinate(draft.latitude),
    longitude: cleanCoordinate(draft.longitude),
    website: cleanOptional(draft.website),
  }

  if (status) payload.status = status
  return payload
}

async function updateCon(con, status = null) {
  savingId.value = con.id
  error.value = ''
  message.value = ''
  try {
    await api.put(`/cons/${con.id}`, buildPayload(con, status))
    message.value = status === 'approved'
      ? t('admin.approvedMessage', { name: con.name })
      : status === 'rejected'
        ? t('admin.rejectedMessage', { name: con.name })
        : t('admin.savedMessage', { name: con.name })
    await fetchReviewCons()
  } catch (err) {
    error.value = t('admin.saveFailed')
  } finally {
    savingId.value = ''
  }
}

function saveCon(con) {
  updateCon(con)
}

function approveCon(con) {
  updateCon(con, 'approved')
}

function rejectCon(con) {
  updateCon(con, 'rejected')
}

function coordinateWarning(draft) {
  const latEmpty = draft.latitude === '' || draft.latitude === null || draft.latitude === undefined
  const lngEmpty = draft.longitude === '' || draft.longitude === null || draft.longitude === undefined
  if (latEmpty || lngEmpty) return t('admin.missingCoordinates')

  const lat = Number(draft.latitude)
  const lng = Number(draft.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return t('admin.invalidCoordinates')
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) return t('admin.possibleSwappedCoordinates')
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return t('admin.invalidCoordinates')
  return ''
}

onMounted(async () => {
  if (authStore.token && !authStore.user) {
    profileLoading.value = true
    await authStore.fetchProfile()
    profileLoading.value = false
  }

  if (canReview.value) {
    await fetchReviewCons()
  }
})
</script>

<style scoped lang="scss">
.admin-page {
  height: 100%;
  overflow-y: auto;
  padding: 28px;
  background: var(--bg);
}

.admin-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.admin-header,
.admin-toolbar,
.review-card,
.admin-state {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
  box-shadow: var(--shadow);
}

.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;

  h2 {
    margin: 2px 0 6px;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }
}

.admin-kicker {
  color: var(--user-primary, var(--primary)) !important;
  font-size: 0.82em;
  font-weight: 800;
  text-transform: uppercase;
}

.admin-toolbar {
  display: grid;
  grid-template-columns: minmax(160px, 220px) 1fr auto;
  gap: 12px;
  align-items: end;
  padding: 16px;

  label {
    display: grid;
    gap: 6px;
    color: var(--text-secondary);
    font-size: 0.82em;
    font-weight: 700;
  }

  input,
  select {
    width: 100%;
    min-height: 40px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    padding: 8px 10px;
    font: inherit;
  }
}

.admin-message {
  margin: 0;
  padding: 10px 14px;
  border-radius: 8px;
  font-weight: 700;

  &.success {
    background: color-mix(in srgb, #16A34A 12%, transparent);
    color: #16A34A;
  }

  &.error {
    background: color-mix(in srgb, #DC2626 12%, transparent);
    color: #DC2626;
  }
}

.admin-state {
  display: grid;
  place-items: center;
  gap: 14px;
  min-height: 180px;
  padding: 28px;
  color: var(--text-secondary);
  text-align: center;

  p {
    margin: 0;
  }
}

.review-list {
  display: grid;
  gap: 14px;
}

.review-card {
  padding: 18px;
}

.review-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h3 {
    margin: 8px 0 4px;
  }

  p,
  small {
    color: var(--text-secondary);
  }

  p {
    margin: 0;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-full);
  padding: 4px 10px;
  font-size: 0.75em;
  font-weight: 800;
  text-transform: uppercase;

  &.status-pending {
    background: color-mix(in srgb, #F59E0B 16%, transparent);
    color: #D97706;
  }

  &.status-approved {
    background: color-mix(in srgb, #16A34A 14%, transparent);
    color: #16A34A;
  }

  &.status-rejected {
    background: color-mix(in srgb, #DC2626 14%, transparent);
    color: #DC2626;
  }
}

.review-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: grid;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.78em;
  font-weight: 700;

  &.wide {
    grid-column: span 2;
  }

  input {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    padding: 8px 10px;
    font: inherit;
    font-size: 1rem;
  }
}

.coordinate-warning {
  grid-column: 1 / -1;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, #F59E0B 12%, transparent);
  color: #D97706;
  font-size: 0.86em;
  font-weight: 700;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
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
  font-weight: 800;
  min-height: 38px;
  padding: 8px 15px;
  text-decoration: none;
  transition: all var(--transition);

  &:disabled {
    cursor: default;
    opacity: 0.65;
  }
}

.btn-primary,
.approve-btn {
  background: var(--user-primary, var(--primary));
  border-color: var(--user-primary, var(--primary));
  color: white;
}

.btn-outline {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}

.reject-btn {
  background: #DC2626;
  border-color: #DC2626;
  color: white;
}

@media (max-width: 900px) {
  .admin-page {
    padding: 14px;
  }

  .admin-header,
  .review-card-head,
  .review-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-toolbar,
  .review-form {
    grid-template-columns: 1fr;
  }

  .field.wide {
    grid-column: span 1;
  }
}
</style>
