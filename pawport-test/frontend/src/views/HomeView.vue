<template>
  <div class="home">
    <div ref="mapContainer" class="map-container"></div>

    <div class="map-controls">
      <button class="control-btn" @click="toggleTrajectories" :class="{ active: showTrajectories }">
        <span class="control-icon">~</span>
        <span class="control-label">{{ showTrajectories ? $t('map.hideTrajectories') : $t('map.showTrajectories') }}</span>
      </button>
      <button class="control-btn" @click="toggleNoTrajectoryNodes" :class="{ active: hideNoTrajectoryNodes }">
        <span class="control-icon">•</span>
        <span class="control-label">{{ hideNoTrajectoryNodes ? $t('map.showNoTrajectoryNodes') : $t('map.hideNoTrajectoryNodes') }}</span>
      </button>
      <button class="control-btn" @click="toggleSeriesMerge" :class="{ active: mergeConSeries }">
        <span class="control-icon">≋</span>
        <span class="control-label">{{ mergeConSeries ? $t('map.splitSeriesCons') : $t('map.mergeSeriesCons') }}</span>
      </button>
      <button
        v-if="authStore.isLoggedIn"
        class="control-btn"
        @click="toggleOnlyMine"
        :class="{ active: showOnlyMine }"
      >
        <span class="control-icon">★</span>
        <span class="control-label">{{ showOnlyMine ? $t('map.showAllCons') : $t('map.onlyMine') }}</span>
      </button>
      <button class="control-btn clear-btn" @click="clearWindows" :disabled="windows.length === 0">
        <span class="control-icon">×</span>
        <span class="control-label">{{ $t('map.clearWindows') }}</span>
      </button>
      <button class="control-btn" @click="downloadCurrentView" :disabled="isCapturingView">
        <span class="control-icon">▣</span>
        <span class="control-label">{{ isCapturingView ? $t('map.screenshotPreparing') : $t('map.downloadScreenshot') }}</span>
      </button>
      <div class="filter-controls">
        <select v-model="mapFilters.region" :aria-label="$t('map.region')">
          <option value="all">{{ $t('map.regionAll') }}</option>
          <option value="mainland">{{ $t('map.regionMainland') }}</option>
          <option value="asia">{{ $t('map.regionAsia') }}</option>
          <option value="usa">{{ $t('map.regionUsa') }}</option>
        </select>
        <input v-model="mapFilters.from" type="date" :aria-label="$t('map.dateFrom')" />
        <input v-model="mapFilters.to" type="date" :aria-label="$t('map.dateTo')" />
        <button class="filter-step" @click="shiftDateRange(-1)" :aria-label="$t('map.previousMonth')">
          {{ $t('map.previousMonth') }}
        </button>
        <button class="filter-step" @click="shiftDateRange(1)" :aria-label="$t('map.nextMonth')">
          {{ $t('map.nextMonth') }}
        </button>
        <button class="filter-step" @click="showAllDates">{{ $t('map.allDates') }}</button>
        <button class="filter-reset" @click="resetFilters">{{ $t('map.resetFilter') }}</button>
      </div>
    </div>

    <button
      class="active-cons-badge"
      v-if="activeCons.length > 0"
      :class="{ active: showActiveCallouts }"
      :aria-pressed="showActiveCallouts"
      :aria-label="`${activeCons.length} ${$t('map.activeCon')}`"
      @click="toggleActiveCallouts"
    >
      <div class="badge-dot"></div>
      <span>{{ activeCons.length }} {{ $t('map.activeCon') }}</span>
    </button>

    <TransitionGroup name="window-stack" tag="div" class="window-layer">
      <section
        v-for="windowItem in windows"
        :key="windowItem.id"
        class="map-window"
        :class="[`window-${windowItem.type}`, { dragging: draggingWindowId === windowItem.id }]"
        :style="windowStyle(windowItem)"
        @pointerdown="bringToFront(windowItem.id)"
      >
        <header class="window-header" @pointerdown.prevent="startDrag($event, windowItem)">
          <div class="window-title">
            <span class="window-dot" :style="{ background: windowItem.color }"></span>
            <strong>{{ windowItem.title }}</strong>
          </div>
          <button class="window-close" @pointerdown.stop @click.stop="closeWindow(windowItem.id)">×</button>
        </header>

        <div class="window-body" v-if="windowItem.type === 'con'">
          <div class="con-summary">
            <div class="con-avatar" :style="{ background: windowItem.data.theme_color || '#6C63FF' }">
              <img v-if="windowItem.data.avatar_url" :src="windowItem.data.avatar_url" alt="" />
              <span v-else>{{ windowItem.data.name?.[0] }}</span>
            </div>
            <div>
              <h3>{{ windowItem.data.name }}</h3>
              <p>{{ formatDate(windowItem.data.start_date) }} - {{ formatDate(windowItem.data.end_date) }}</p>
              <p v-if="shouldShowVenueLine(windowItem.data)">{{ windowItem.data.venue }}</p>
              <p v-if="windowItem.data.address" class="muted">{{ windowItem.data.address }}</p>
            </div>
          </div>

          <div v-if="windowItem.data.isActive" class="active-pill">
            <span></span>{{ $t('map.activeCon') }}
          </div>

          <div class="meta-list">
            <a v-if="windowItem.data.website" :href="windowItem.data.website" target="_blank" rel="noopener">
              {{ $t('con.website') }}
            </a>
            <span v-if="windowItem.data.theme">{{ $t('con.theme') }}: {{ windowItem.data.theme }}</span>
          </div>

          <div v-if="windowItem.data.series?.length > 1" class="series-strip">
            <span class="section-label">{{ windowItem.data.series_name || windowItem.data.series_key }}</span>
            <button
              v-for="edition in windowItem.data.series"
              :key="edition.id"
              class="series-chip"
              :class="{ active: edition.id === windowItem.data.id }"
              @click="openConWindow(edition, windowItem)"
            >
              {{ edition.edition_label || new Date(edition.start_date).getFullYear() }}
            </button>
          </div>

          <div class="divider"></div>

          <div class="attendee-section">
            <h4>{{ $t('con.attendees') }} ({{ windowItem.data.attendees?.length || 0 }})</h4>
            <div class="attendee-grid">
              <button
                v-for="attendee in limitedAttendees(windowItem.data.attendees)"
                :key="attendee.id"
                class="attendee-item"
                @click="openUserWindow(attendee, windowItem)"
              >
                <span class="attendee-avatar" :style="{ background: attendee.theme_color || '#6C63FF' }">
                  <img v-if="attendee.avatar_url" :src="attendee.avatar_url" alt="" />
                  <span v-else>{{ displayName(attendee)[0] }}</span>
                </span>
                <span class="attendee-name">{{ displayName(attendee) }}</span>
              </button>
              <div v-if="(windowItem.data.attendees?.length || 0) > 19" class="attendee-more">
                +{{ windowItem.data.attendees.length - 19 }}
              </div>
            </div>
          </div>

          <div v-if="windowItem.data.hotelStats?.hotels?.length" class="hotel-stats">
            <div class="hotel-stats-head">
              <span class="section-label">{{ $t('hotel.distribution') }}</span>
              <strong>{{ windowItem.data.hotelStats.total }}</strong>
            </div>
            <div class="hotel-stats-body">
              <div class="hotel-pie" :style="{ background: hotelPieBackground(windowItem.data.hotelStats.hotels) }"></div>
              <div class="hotel-legend">
                <div v-for="hotel in windowItem.data.hotelStats.hotels" :key="`${hotel.name}-${hotel.address}`" class="hotel-legend-item">
                  <span class="hotel-legend-dot" :style="{ background: hotel.color }"></span>
                  <span class="hotel-legend-name">{{ hotel.name }}</span>
                  <span class="hotel-legend-count">{{ hotel.count }} · {{ hotel.percent }}%</span>
                </div>
              </div>
            </div>
          </div>

          <div class="window-actions" v-if="authStore.isLoggedIn">
            <button
              class="btn"
              :class="isMeAttending(windowItem) ? 'btn-outline' : 'btn-primary'"
              @click="toggleAttendance(windowItem)"
            >
              {{ isMeAttending(windowItem) ? $t('con.removeAttendance') : $t('con.markAttended') }}
            </button>
          </div>
        </div>

        <div class="window-body" v-else-if="windowItem.type === 'user'">
          <div class="user-summary">
            <div class="user-avatar" :style="{ background: windowItem.color }">
              <img v-if="windowItem.data.avatar_url" :src="windowItem.data.avatar_url" alt="" />
              <span v-else>{{ displayName(windowItem.data)[0] }}</span>
            </div>
            <h3>{{ displayName(windowItem.data) }}</h3>
            <p v-if="windowItem.data.bio">{{ windowItem.data.bio }}</p>
          </div>

          <div v-if="windowItem.loading" class="loading-row">{{ $t('common.loading') }}</div>
          <div v-else-if="windowItem.data.cons?.length" class="history-list">
            <h4>{{ $t('user.conHistory') }}</h4>
            <article v-for="visit in windowItem.data.cons" :key="visit.id" class="history-item">
              <span class="history-dot" :style="{ background: visit.Con?.theme_color || windowItem.color }"></span>
              <div>
                <strong>{{ visit.Con?.name }}</strong>
                <p>{{ formatDate(visit.Con?.start_date) }} · {{ visit.Con?.city || '' }}</p>
                <p v-if="visit.comment" class="muted">{{ visit.comment }}</p>
                <p v-if="visit.Hotels?.length" class="hotel-line">
                  {{ $t('con.hotel') }}: {{ visit.Hotels.map(hotel => hotel.name).join(', ') }}
                </p>
              </div>
            </article>
          </div>
          <p v-else class="muted">{{ $t('common.noResults') }}</p>
        </div>
      </section>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useConsStore } from '@/stores/cons'
import { useThemeStore } from '@/stores/theme'
import api from '@/utils/api'
import html2canvas from 'html2canvas'
import L from 'leaflet'

const authStore = useAuthStore()
const consStore = useConsStore()
const themeStore = useThemeStore()

const mapContainer = ref(null)
const showTrajectories = ref(true)
const hideNoTrajectoryNodes = ref(false)
const mergeConSeries = ref(true)
const showOnlyMine = ref(false)
const showActiveCallouts = ref(true)
const isCapturingView = ref(false)
const windows = ref([])
const myConIds = ref(new Set())
const draggingWindowId = ref(null)

let map = null
let markersLayer = null
let activeCalloutsLayer = null
let trajectoriesLayer = null
let labelLayer = null
let tileLayers = []
let windowZ = 2100
let dragState = null
let trajectoryHideTimer = null
let currentUserTrajectoryTimer = null
const trajectoryUsers = ref([])
const trajectoryLayersByUser = new Map()
const TRAJECTORY_PANE = 'trajectoryPane'

function toDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addMonths(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function defaultFilters() {
  const today = new Date()
  return {
    region: 'all',
    from: toDateInput(addMonths(today, -1)),
    to: toDateInput(addMonths(today, 1)),
  }
}

const mapFilters = reactive(defaultFilters())

const mapLabels = [
  { type: 'country', lat: 35.8, lng: 103.8, zh: '中国', en: 'China' },
  { type: 'country', lat: 39.6, lng: -98.5, zh: '美国', en: 'United States' },
  { type: 'country', lat: 56.1, lng: -106.3, zh: '加拿大', en: 'Canada' },
  { type: 'country', lat: 61.5, lng: 96.8, zh: '俄罗斯', en: 'Russia' },
  { type: 'country', lat: 36.2, lng: 138.3, zh: '日本', en: 'Japan' },
  { type: 'country', lat: 36.4, lng: 127.8, zh: '韩国', en: 'South Korea' },
  { type: 'country', lat: 51.3, lng: 10.4, zh: '德国', en: 'Germany' },
  { type: 'country', lat: 46.6, lng: 2.2, zh: '法国', en: 'France' },
  { type: 'country', lat: 54.0, lng: -2.5, zh: '英国', en: 'United Kingdom' },
  { type: 'country', lat: -25.3, lng: 133.8, zh: '澳大利亚', en: 'Australia' },
  { type: 'country', lat: -10.0, lng: -53.2, zh: '巴西', en: 'Brazil' },
  { type: 'country', lat: 22.9, lng: 79.8, zh: '印度', en: 'India' },
  { type: 'city', lat: 39.9042, lng: 116.4074, zh: '北京', en: 'Beijing' },
  { type: 'city', lat: 31.2304, lng: 121.4737, zh: '上海', en: 'Shanghai' },
  { type: 'city', lat: 23.1291, lng: 113.2644, zh: '广州', en: 'Guangzhou' },
  { type: 'city', lat: 22.5431, lng: 114.0579, zh: '深圳', en: 'Shenzhen' },
  { type: 'city', lat: 30.5728, lng: 104.0668, zh: '成都', en: 'Chengdu' },
  { type: 'city', lat: 22.3193, lng: 114.1694, zh: '香港', en: 'Hong Kong' },
  { type: 'city', lat: 25.033, lng: 121.5654, zh: '台北', en: 'Taipei' },
  { type: 'city', lat: 35.6762, lng: 139.6503, zh: '东京', en: 'Tokyo' },
  { type: 'city', lat: 37.5665, lng: 126.978, zh: '首尔', en: 'Seoul' },
  { type: 'city', lat: 1.3521, lng: 103.8198, zh: '新加坡', en: 'Singapore' },
  { type: 'city', lat: 13.7563, lng: 100.5018, zh: '曼谷', en: 'Bangkok' },
  { type: 'city', lat: 3.139, lng: 101.6869, zh: '吉隆坡', en: 'Kuala Lumpur' },
  { type: 'city', lat: -33.8688, lng: 151.2093, zh: '悉尼', en: 'Sydney' },
  { type: 'city', lat: 34.0522, lng: -118.2437, zh: '洛杉矶', en: 'Los Angeles' },
  { type: 'city', lat: 41.8781, lng: -87.6298, zh: '芝加哥', en: 'Chicago' },
  { type: 'city', lat: 40.7128, lng: -74.006, zh: '纽约', en: 'New York' },
  { type: 'city', lat: 47.6062, lng: -122.3321, zh: '西雅图', en: 'Seattle' },
  { type: 'city', lat: 43.6532, lng: -79.3832, zh: '多伦多', en: 'Toronto' },
  { type: 'city', lat: 51.5072, lng: -0.1276, zh: '伦敦', en: 'London' },
  { type: 'city', lat: 48.8566, lng: 2.3522, zh: '巴黎', en: 'Paris' },
  { type: 'city', lat: 52.52, lng: 13.405, zh: '柏林', en: 'Berlin' },
]

const scopedCons = computed(() => {
  const base = consStore.mapCons.filter(conMatchesFilters)
  return showOnlyMine.value && authStore.isLoggedIn
    ? base.filter(con => myConIds.value.has(con.id))
    : base
})

const candidateCons = computed(() => {
  return mergeConSeries.value ? mergeSeriesCons(scopedCons.value) : scopedCons.value
})

const trajectoryDisplayContext = computed(() => {
  const sourceCons = scopedCons.value
  const visibleCons = candidateCons.value
  const sourceIds = new Set(sourceCons.map(con => con.id))
  const visibleIds = new Set(visibleCons.map(con => con.id))
  const sourceConById = new Map(sourceCons.map(con => [con.id, con]))
  const representativeBySeries = new Map()

  if (mergeConSeries.value) {
    visibleCons.forEach(con => {
      const key = conSeriesKey(con)
      if (key) representativeBySeries.set(key, con)
    })
  }

  return { sourceIds, visibleIds, sourceConById, representativeBySeries }
})

const trajectoryNodeIds = computed(() => {
  const context = trajectoryDisplayContext.value
  const nodeIds = new Set()

  trajectoryUsers.value.forEach(user => {
    const visits = getSortedTrajectoryVisits(user, context)
    if (visits.length < 2) return
    visits.forEach(visit => nodeIds.add(visit.Con.id))
  })

  return nodeIds
})

const filteredCons = computed(() => {
  if (!hideNoTrajectoryNodes.value) return candidateCons.value
  return candidateCons.value.filter(con => trajectoryNodeIds.value.has(con.id))
})
const activeCons = computed(() => filteredCons.value.filter(con => con.isActive))

function displayName(user) {
  return user?.display_name || user?.username || ''
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString(themeStore.locale === 'zh' ? 'zh-CN' : 'en-US')
}

function limitedAttendees(attendees = []) {
  return attendees.slice(0, 19)
}

function isMeAttending(windowItem) {
  if (!authStore.user || !windowItem?.data?.attendees) return false
  return windowItem.data.attendees.some(attendee => attendee.id === authStore.user.id)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function windowStyle(windowItem) {
  return {
    left: `${windowItem.x}px`,
    top: `${windowItem.y}px`,
    zIndex: windowItem.z,
    borderTopColor: windowItem.color,
  }
}

function getHomeRect() {
  return mapContainer.value?.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 }
}

function placeWindow(anchor) {
  const rect = getHomeRect()
  const fallback = { x: Math.min(360, rect.width - 380), y: 72 + windows.value.length * 24 }
  const base = anchor?.x !== undefined ? anchor : fallback
  return {
    x: clamp(base.x + 20, 12, Math.max(12, rect.width - 380)),
    y: clamp(base.y - 64, 12, Math.max(12, rect.height - 360)),
  }
}

function bringToFront(id) {
  const item = windows.value.find(windowItem => windowItem.id === id)
  if (item) item.z = ++windowZ
}

function closeWindow(id) {
  windows.value = windows.value.filter(windowItem => windowItem.id !== id)
}

function clearWindows() {
  windows.value = []
}

async function downloadCurrentView() {
  if (!mapContainer.value || isCapturingView.value) return

  isCapturingView.value = true
  let cleanupCapture = null
  try {
    map?.invalidateSize()
    await nextTick()
    if (document.fonts?.ready) await document.fonts.ready
    cleanupCapture = prepareScreenshotCapture()
    await waitForNextFrame()

    const canvas = await html2canvas(mapContainer.value, {
      backgroundColor: themeStore.darkMode ? '#05070B' : '#F8FAFC',
      ignoreElements: element => element.classList?.contains('leaflet-control-container'),
      imageTimeout: 15000,
      logging: false,
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
    })
    cleanupCapture?.()
    cleanupCapture = null

    await downloadCanvas(canvas, screenshotFilename())
  } catch (error) {
    console.warn('Failed to download map screenshot:', error)
    window.alert(themeStore.locale === 'zh' ? '截图生成失败，请稍后再试。' : 'Screenshot failed. Please try again.')
  } finally {
    cleanupCapture?.()
    isCapturingView.value = false
  }
}

function prepareScreenshotCapture() {
  const cleanups = [
    hideElementsForScreenshot('.trajectory-line'),
    createScreenshotTrajectoryOverlay(),
    createScreenshotAvatarFrame(),
  ].filter(Boolean)

  return () => {
    cleanups.reverse().forEach(cleanup => cleanup())
  }
}

function hideElementsForScreenshot(selector) {
  if (!mapContainer.value) return null

  const elements = Array.from(mapContainer.value.querySelectorAll(selector))
  const previous = elements.map(element => ({
    element,
    visibility: element.style.visibility,
  }))

  elements.forEach(element => {
    element.style.visibility = 'hidden'
  })

  return () => {
    previous.forEach(({ element, visibility }) => {
      element.style.visibility = visibility
    })
  }
}

function createScreenshotTrajectoryOverlay() {
  if (!mapContainer.value || !map || !showTrajectories.value) return null

  const rect = mapContainer.value.getBoundingClientRect()
  if (!rect.width || !rect.height) return null

  const canvas = document.createElement('canvas')
  const ratio = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(rect.width * ratio)
  canvas.height = Math.round(rect.height * ratio)
  canvas.className = 'screenshot-trajectory-overlay'
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '449',
  })

  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(ratio, ratio)
  drawScreenshotTrajectoryLines(ctx)
  mapContainer.value.appendChild(canvas)

  return () => canvas.remove()
}

function drawScreenshotTrajectoryLines(ctx) {
  const segmentCounts = collectSegmentCounts(trajectoryUsers.value)
  const opacity = myConIds.value.size ? 0.72 : 0.56

  trajectoryUsers.value.forEach(user => {
    getUserTrajectorySegments(user, segmentCounts).forEach(segment => {
      const points = generateCurve(segment.start, segment.end)
        .map(latLng => map.latLngToContainerPoint(latLng))
      if (points.length < 2) return

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      points.slice(1).forEach(point => ctx.lineTo(point.x, point.y))
      ctx.lineWidth = Math.min(9, 2 + segment.count)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = opacity
      ctx.strokeStyle = segment.color
      ctx.shadowColor = 'rgba(15, 23, 42, 0.18)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 2
      ctx.stroke()
      ctx.restore()
    })
  })
}

function createScreenshotAvatarFrame() {
  if (!mapContainer.value) return null

  const color = authStore.user?.theme_color || '#6C63FF'
  const name = displayName(authStore.user) || 'PawPort'
  const subtitle = authStore.user?.username
    ? `@${authStore.user.username}`
    : (themeStore.locale === 'zh' ? '兽展护照' : 'Furry Con Passport')
  const frame = document.createElement('div')
  frame.className = 'screenshot-avatar-frame'
  frame.style.borderColor = color
  frame.style.background = themeStore.darkMode ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.9)'

  const avatar = document.createElement('span')
  avatar.className = 'screenshot-avatar'
  avatar.style.background = color
  const hasAvatarImage = Boolean(authStore.user?.avatar_url)
  if (hasAvatarImage) {
    avatar.style.backgroundImage = `url("${new URL(authStore.user.avatar_url, window.location.origin)}")`
    avatar.style.backgroundPosition = 'center'
    avatar.style.backgroundRepeat = 'no-repeat'
    avatar.style.backgroundSize = 'cover'
  }
  const label = document.createElement('span')
  label.className = 'screenshot-avatar-label'
  label.textContent = name[0] || 'P'
  label.style.visibility = hasAvatarImage ? 'hidden' : ''
  avatar.appendChild(label)

  const text = document.createElement('span')
  text.className = 'screenshot-avatar-text'
  text.style.color = themeStore.darkMode ? '#F8FAFC' : '#111827'
  text.innerHTML = `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(subtitle)}</small>`

  frame.appendChild(avatar)
  frame.appendChild(text)
  mapContainer.value.appendChild(frame)

  return () => frame.remove()
}

function waitForNextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

function screenshotFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `pawport-map-${stamp}.png`
}

async function downloadCanvas(canvas, filename) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  const link = document.createElement('a')
  link.download = filename

  if (blob) {
    const url = URL.createObjectURL(blob)
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    return
  }

  link.href = canvas.toDataURL('image/png')
  link.click()
}

async function drawAvatarFrame(canvas) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const scale = canvas.width / Math.max(1, mapContainer.value?.clientWidth || canvas.width)
  const color = authStore.user?.theme_color || '#6C63FF'
  const name = displayName(authStore.user) || 'PawPort'
  const subtitle = authStore.user?.username
    ? `@${authStore.user.username}`
    : (themeStore.locale === 'zh' ? '兽展护照' : 'Furry Con Passport')
  const pad = 22 * scale
  const cardPadding = 14 * scale
  const avatarSize = 62 * scale
  const cardWidth = Math.min(330 * scale, canvas.width - pad * 2)
  const cardHeight = 90 * scale
  const x = canvas.width - cardWidth - pad
  const y = canvas.height - cardHeight - pad
  const avatarX = x + cardPadding
  const avatarY = y + (cardHeight - avatarSize) / 2
  const textX = avatarX + avatarSize + 14 * scale
  const textWidth = cardWidth - (textX - x) - cardPadding

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.28)'
  ctx.shadowBlur = 18 * scale
  ctx.shadowOffsetY = 8 * scale
  roundedRect(ctx, x, y, cardWidth, cardHeight, 22 * scale)
  ctx.fillStyle = themeStore.darkMode ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.88)'
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 1.5 * scale
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.restore()

  await drawAvatar(ctx, {
    x: avatarX,
    y: avatarY,
    size: avatarSize,
    color,
    imageUrl: authStore.user?.avatar_url,
    label: name[0] || 'P',
  })

  ctx.save()
  ctx.fillStyle = themeStore.darkMode ? '#F8FAFC' : '#111827'
  ctx.font = `${Math.round(20 * scale)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textBaseline = 'top'
  drawFittedText(ctx, name, textX, y + 22 * scale, textWidth)
  ctx.fillStyle = themeStore.darkMode ? 'rgba(226, 232, 240, 0.72)' : 'rgba(75, 85, 99, 0.82)'
  ctx.font = `${Math.round(13 * scale)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  drawFittedText(ctx, subtitle, textX, y + 52 * scale, textWidth)
  ctx.restore()
}

async function drawAvatar(ctx, { x, y, size, color, imageUrl, label }) {
  const radius = size / 2
  const centerX = x + radius
  const centerY = y + radius
  const image = await loadCanvasImage(imageUrl)

  ctx.save()
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (image) {
    ctx.drawImage(image, x, y, size, size)
  } else {
    ctx.fillStyle = color
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `${Math.round(size * 0.44)}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, centerX, centerY + size * 0.02)
  }
  ctx.restore()

  ctx.save()
  ctx.lineWidth = Math.max(3, size * 0.08)
  ctx.strokeStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = Math.max(2, size * 0.035)
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius + ctx.lineWidth, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function loadCanvasImage(source) {
  if (!source) return Promise.resolve(null)

  return new Promise(resolve => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = new URL(source, window.location.origin).toString()
  })
}

function drawFittedText(ctx, text, x, y, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y)
    return
  }

  let output = text
  while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1)
  }
  ctx.fillText(`${output}...`, x, y)
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function toggleActiveCallouts() {
  showActiveCallouts.value = !showActiveCallouts.value
  renderMarkers()
}

function toggleOnlyMine() {
  showOnlyMine.value = !showOnlyMine.value
  renderMarkers()
  renderTrajectories()
}

function toggleSeriesMerge() {
  mergeConSeries.value = !mergeConSeries.value
  renderMarkers()
  renderTrajectories()
}

async function toggleNoTrajectoryNodes() {
  hideNoTrajectoryNodes.value = !hideNoTrajectoryNodes.value
  if (hideNoTrajectoryNodes.value && !trajectoryUsers.value.length) {
    await loadTrajectoryUsers()
  }
  renderMarkers()
  renderTrajectories()
}

function resetFilters() {
  Object.assign(mapFilters, defaultFilters())
}

function showAllDates() {
  mapFilters.from = ''
  mapFilters.to = ''
}

function shouldShowVenueLine(con) {
  if (!con?.venue) return false
  const venue = normalizeDisplayText(con.venue)
  const address = normalizeDisplayText(con.address)
  if (!venue) return false
  if (!address) return true
  return !address.includes(venue) && !venue.includes(address)
}

function normalizeDisplayText(value = '') {
  return String(value).replace(/\s+/g, '').trim().toLowerCase()
}

function parseDateInput(value, fallback) {
  const source = value || fallback
  const date = new Date(`${source}T00:00:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function shiftDateRange(months) {
  const fallback = defaultFilters()
  mapFilters.from = toDateInput(addMonths(parseDateInput(mapFilters.from, fallback.from), months))
  mapFilters.to = toDateInput(addMonths(parseDateInput(mapFilters.to, fallback.to), months))
}

function mergeSeriesCons(cons) {
  const groups = new Map()
  const merged = []

  cons.forEach(con => {
    const key = conSeriesKey(con)
    if (!key) {
      merged.push(con)
      return
    }

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(con)
  })

  groups.forEach(group => {
    merged.push([...group].sort(compareSeriesRepresentatives)[0])
  })

  return merged
}

function conSeriesKey(con) {
  const seriesKey = String(con.series_key || '').trim()
  if (seriesKey) return `key:${seriesKey}`

  const seriesName = normalizeSeriesText(con.series_name)
  return seriesName ? `name:${seriesName}` : ''
}

function normalizeSeriesText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase()
}

function compareSeriesRepresentatives(a, b) {
  const activeScore = Number(Boolean(b.isActive)) - Number(Boolean(a.isActive))
  if (activeScore !== 0) return activeScore

  const aDistance = conDistanceFromNow(a)
  const bDistance = conDistanceFromNow(b)
  if (aDistance !== bDistance) return aDistance - bDistance

  const aTime = new Date(a.start_date || 0).getTime()
  const bTime = new Date(b.start_date || 0).getTime()
  if (aTime !== bTime) return bTime - aTime

  return String(a.name || '').localeCompare(String(b.name || ''), themeStore.locale === 'zh' ? 'zh-Hans-CN' : 'en')
}

function conDistanceFromNow(con) {
  const now = Date.now()
  const start = new Date(`${con.start_date || ''}T00:00:00`).getTime()
  const end = new Date(`${con.end_date || con.start_date || ''}T23:59:59`).getTime()

  if (!Number.isFinite(start)) return Number.MAX_SAFE_INTEGER
  if (Number.isFinite(end) && now >= start && now <= end) return 0
  if (now < start) return start - now
  return now - (Number.isFinite(end) ? end : start)
}

function startDrag(event, windowItem) {
  bringToFront(windowItem.id)
  draggingWindowId.value = windowItem.id
  const rect = getHomeRect()
  dragState = {
    id: windowItem.id,
    offsetX: event.clientX - rect.left - windowItem.x,
    offsetY: event.clientY - rect.top - windowItem.y,
  }
  document.addEventListener('pointermove', onDrag)
  document.addEventListener('pointerup', stopDrag, { once: true })
}

function onDrag(event) {
  if (!dragState) return
  const item = windows.value.find(windowItem => windowItem.id === dragState.id)
  if (!item) return
  const rect = getHomeRect()
  item.x = clamp(event.clientX - rect.left - dragState.offsetX, 8, Math.max(8, rect.width - 320))
  item.y = clamp(event.clientY - rect.top - dragState.offsetY, 8, Math.max(8, rect.height - 120))
}

function stopDrag() {
  document.removeEventListener('pointermove', onDrag)
  draggingWindowId.value = null
  dragState = null
}

function upsertWindow(type, rawData, anchor, extras = {}) {
  const id = `${type}:${rawData.id}`
  const existing = windows.value.find(windowItem => windowItem.id === id)
  const position = existing || placeWindow(anchor)
  const color = rawData.theme_color || '#6C63FF'
  const item = {
    id,
    type,
    title: type === 'con' ? rawData.name : displayName(rawData),
    data: rawData,
    color,
    x: position.x,
    y: position.y,
    z: ++windowZ,
    loading: false,
    ...extras,
  }

  if (existing) {
    Object.assign(existing, item)
  } else {
    windows.value.push(item)
  }

  return existing || item
}

async function openConWindow(con, sourceWindow = null) {
  const anchor = sourceWindow || (map && con.latitude && con.longitude
    ? map.latLngToContainerPoint([Number(con.latitude), Number(con.longitude)])
    : null)
  let windowItem

  if (sourceWindow?.type === 'con') {
    const nextId = `con:${con.id}`
    windows.value = windows.value.filter(item => item === sourceWindow || item.id !== nextId)
    windowItem = sourceWindow
    Object.assign(windowItem, {
      id: nextId,
      type: 'con',
      title: con.name,
      data: { ...con, attendees: con.Users || [], hotelStats: { total: 0, hotels: [] } },
      color: con.theme_color || '#6C63FF',
      z: ++windowZ,
      loading: false,
    })
  } else {
    windowItem = upsertWindow('con', { ...con, attendees: con.Users || [], hotelStats: { total: 0, hotels: [] } }, anchor)
  }

  try {
    const [attendeeResult, seriesResult, hotelStatsResult] = await Promise.all([
      consStore.fetchAttendees(con.id),
      con.series_key ? api.get(`/cons/series/${encodeURIComponent(con.series_key)}`).catch(() => null) : Promise.resolve(null),
      fetchConHotelStats(con.id).catch(() => ({ total: 0, hotels: [] })),
    ])
    windowItem.data.attendees = attendeeResult.attendees || []
    windowItem.data.series = seriesResult?.data?.cons || []
    windowItem.data.hotelStats = hotelStatsResult || { total: 0, hotels: [] }
  } catch (error) {
    windowItem.data.attendees = windowItem.data.attendees || []
  }
}

async function fetchConHotelStats(conId) {
  const res = await api.get(`/cons/${conId}/hotel-stats`)
  return res.data
}

async function openUserWindow(user, sourceWindow = null) {
  const windowItem = upsertWindow('user', user, sourceWindow, { loading: true })

  try {
    const res = await api.get(`/users/${user.id}`)
    windowItem.data = res.data.user
    windowItem.title = displayName(res.data.user)
    windowItem.color = res.data.user.theme_color || windowItem.color
  } catch (error) {
    windowItem.data = user
  } finally {
    windowItem.loading = false
  }
}

async function toggleAttendance(windowItem) {
  const conId = windowItem.data.id
  const shouldAttend = !isMeAttending(windowItem)

  try {
    if (shouldAttend) {
      await consStore.markAttendance(conId, {})
    } else {
      await consStore.removeAttendance(conId)
    }

    setMyAttendance(conId, shouldAttend)
    await syncConAttendees(conId)
    await syncConHotelStats(conId)
    renderMarkers()
    await refreshCurrentUserTrajectory()
  } catch (error) {
    console.error('Failed to update attendance:', error)
  }
}

function setMyAttendance(conId, isAttending) {
  const next = new Set(myConIds.value)
  if (isAttending) {
    next.add(conId)
  } else {
    next.delete(conId)
  }
  myConIds.value = next
}

async function syncConAttendees(conId) {
  const res = await consStore.fetchAttendees(conId)
  const attendees = res.attendees || []

  const mapCon = consStore.mapCons.find(con => con.id === conId)
  if (mapCon) {
    mapCon.Users = attendees
  }

  windows.value.forEach(windowItem => {
    if (windowItem.type !== 'con' || windowItem.data.id !== conId) return
    windowItem.data.attendees = attendees
    windowItem.data.Users = attendees
  })

  return attendees
}

async function syncConHotelStats(conId) {
  try {
    const hotelStats = await fetchConHotelStats(conId)
    windows.value.forEach(windowItem => {
      if (windowItem.type !== 'con' || windowItem.data.id !== conId) return
      windowItem.data.hotelStats = hotelStats
    })
    return hotelStats
  } catch (error) {
    return null
  }
}

function handleAttendanceUpdated(event) {
  const conId = event.detail?.conId
  if (!conId) return

  syncConAttendees(conId)
  syncConHotelStats(conId)
}

function currentUserPatch() {
  if (!authStore.user) return null
  return {
    id: authStore.user.id,
    username: authStore.user.username,
    display_name: authStore.user.display_name,
    avatar_url: authStore.user.avatar_url,
    theme_color: authStore.user.theme_color,
    bio: authStore.user.bio,
  }
}

function syncCurrentUserProfileLocally() {
  const patch = currentUserPatch()
  if (!patch) return

  const updateAttendees = attendees => (attendees || []).map(attendee => (
    attendee.id === patch.id ? { ...attendee, ...patch } : attendee
  ))

  consStore.mapCons.forEach(con => {
    if (Array.isArray(con.Users)) {
      con.Users = updateAttendees(con.Users)
    }
  })

  windows.value.forEach(windowItem => {
    if (windowItem.type === 'con') {
      windowItem.data.attendees = updateAttendees(windowItem.data.attendees)
      windowItem.data.Users = updateAttendees(windowItem.data.Users)
    }

    if (windowItem.type === 'user' && windowItem.data.id === patch.id) {
      windowItem.data = { ...windowItem.data, ...patch }
      windowItem.title = displayName(windowItem.data)
      windowItem.color = patch.theme_color || windowItem.color
    }
  })
}

function handleProfileUpdated() {
  syncCurrentUserProfileLocally()
  renderMarkers()
  refreshCurrentUserTrajectory({ animate: false })
}

function initMap() {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [35, 105],
    zoom: 4,
    minZoom: 2,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  const trajectoryPane = map.createPane(TRAJECTORY_PANE)
  trajectoryPane.style.zIndex = 450
  trajectoriesLayer = L.layerGroup().addTo(map)
  markersLayer = L.layerGroup().addTo(map)
  activeCalloutsLayer = L.layerGroup().addTo(map)
  labelLayer = L.layerGroup().addTo(map)
  map.on('zoomend', renderMarkers)
  applyTileTheme()
  renderMapLabels()
}

function makeTile(url) {
  return L.tileLayer(url, {
    crossOrigin: 'anonymous',
    subdomains: 'abcd',
    maxZoom: 19,
    className: themeStore.darkMode ? 'dark-tile' : 'light-tile',
  })
}

function applyTileTheme() {
  if (!map) return
  tileLayers.forEach(layer => map.removeLayer(layer))
  const dark = themeStore.darkMode
  tileLayers = [
    makeTile(dark
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'),
  ]
  tileLayers.forEach(layer => layer.addTo(map))
  renderMapLabels()
}

function renderMapLabels() {
  if (!labelLayer) return
  labelLayer.clearLayers()
  const localeKey = themeStore.locale === 'zh' ? 'zh' : 'en'

  mapLabels.forEach(label => {
    const text = escapeHtml(label[localeKey])
    const icon = L.divIcon({
      className: `map-label ${label.type}-label`,
      html: `<span>${text}</span>`,
      iconSize: [120, 24],
      iconAnchor: [60, 12],
    })
    labelLayer.addLayer(L.marker([label.lat, label.lng], { icon, interactive: false }))
  })
}

function markerHtml(con, color, borderColor, size, isMine) {
  const label = escapeHtml(con.name?.[0] || '?')
  const textColor = con.isPast && !con.isActive ? '#5A6475' : '#FFFFFF'
  const width = Math.round(size * 1.38)
  const height = size
  const posterUrl = lowResMarkerImageUrl(con.poster_url || con.avatar_url)
  const image = posterUrl
    ? `<span class="marker-media" style="background-image:url(&quot;${escapeHtml(posterUrl)}&quot;)"></span>`
    : `<span class="marker-label">${label}</span>`
  return `
    <div class="marker-wrapper ${con.isActive ? 'active' : ''} ${isMine ? 'mine' : ''}" style="width:${width + 18}px;height:${height + 18}px;">
      ${con.isActive ? `<div class="marker-pulse" style="border-color:${color}"></div>` : ''}
      <div class="marker-card" style="background:${color};border-color:${borderColor};color:${textColor};width:${width}px;height:${height}px;">${image}</div>
    </div>
  `
}

function lowResMarkerImageUrl(source) {
  if (!source) return ''

  const width = 96
  const height = 72
  const thumbnailUrl = `/api/media/thumbnail?url=${encodeURIComponent(source)}&w=${width}&h=${height}`
  if (source.startsWith('/uploads/')) return thumbnailUrl

  try {
    const parsed = new URL(source, window.location.origin)
    if (parsed.hostname === 'images.furrycons.cn') {
      return thumbnailUrl
    }
  } catch (error) {
    return source
  }

  return source
}

function renderMarkers() {
  if (!markersLayer || !activeCalloutsLayer) return
  markersLayer.clearLayers()
  activeCalloutsLayer.clearLayers()

  buildMarkerPlacements(filteredCons.value).forEach(({ con, latLng }) => {
    const isMine = myConIds.value.has(con.id)
    const baseColor = con.theme_color || '#6C63FF'
    const color = con.isPast && !con.isActive ? '#F8FAFC' : baseColor
    const borderColor = con.isPast && !con.isActive ? '#8A94A6' : baseColor
    const size = con.isActive || isMine ? 42 : 32

    const width = Math.round(size * 1.38)
    const height = size
    const icon = L.divIcon({
      className: 'con-marker',
      html: markerHtml(con, color, borderColor, size, isMine),
      iconSize: [width + 18, height + 18],
      iconAnchor: [(width + 18) / 2, (height + 18) / 2],
    })

    const marker = L.marker(latLng, { icon })
    marker.on('click', () => openConWindow(con, map?.latLngToContainerPoint(latLng)))
    markersLayer.addLayer(marker)

    if (con.isActive && con.Users?.length && showActiveCallouts.value) {
      renderActiveCallout(con, latLng)
    }
  })
}

function buildMarkerPlacements(cons) {
  const groups = new Map()

  cons.forEach(con => {
    if (!con.latitude || !con.longitude) return

    const lat = Number(con.latitude)
    const lng = Number(con.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(con)
  })

  const placements = []
  groups.forEach(group => {
    const sorted = [...group].sort(compareClusterCons)
    sorted.forEach((con, index) => {
      const baseLatLng = [Number(con.latitude), Number(con.longitude)]
      const offset = markerClusterOffset(index, sorted.length)
      const latLng = offset.x || offset.y
        ? offsetLatLng(baseLatLng, offset)
        : baseLatLng

      placements.push({ con, latLng })
    })
  })

  return placements
}

function compareClusterCons(a, b) {
  const aTime = new Date(a.start_date || 0).getTime()
  const bTime = new Date(b.start_date || 0).getTime()
  if (aTime !== bTime) return aTime - bTime
  return String(a.name || '').localeCompare(String(b.name || ''), themeStore.locale === 'zh' ? 'zh-Hans-CN' : 'en')
}

function markerClusterOffset(index, total) {
  if (total <= 1) return { x: 0, y: 0 }

  const columns = Math.ceil(Math.sqrt(total))
  const rows = Math.ceil(total / columns)
  const column = index % columns
  const row = Math.floor(index / columns)

  return {
    x: (column - (columns - 1) / 2) * 46,
    y: (row - (rows - 1) / 2) * 34,
  }
}

function hotelPieBackground(hotels = []) {
  const total = hotels.reduce((sum, hotel) => sum + hotel.count, 0)
  if (!total) return 'var(--bg-secondary)'

  let cursor = 0
  const segments = hotels.map(hotel => {
    const start = cursor
    cursor += (hotel.count / total) * 100
    return `${hotel.color} ${start}% ${cursor}%`
  })

  return `conic-gradient(${segments.join(', ')})`
}

function offsetLatLng(latLng, offset) {
  if (!map) return latLng

  const point = map.latLngToLayerPoint(latLng)
  const shifted = L.point(point.x + offset.x, point.y + offset.y)
  const shiftedLatLng = map.layerPointToLatLng(shifted)
  return [shiftedLatLng.lat, shiftedLatLng.lng]
}

function renderActiveCallout(con, latLng = [Number(con.latitude), Number(con.longitude)]) {
  const attendees = con.Users || []
  const visible = attendees.slice(0, 19)
  const avatars = visible.map(attendee => {
    const name = escapeHtml(displayName(attendee))
    const bg = attendee.theme_color || '#6C63FF'
    return `<span title="${name}" class="callout-avatar" style="background:${bg}">
      ${attendee.avatar_url ? `<img src="${escapeHtml(attendee.avatar_url)}" alt="" />` : escapeHtml(name[0] || '?')}
    </span>`
  }).join('')
  const more = attendees.length > 19 ? `<span class="callout-avatar more">+${attendees.length - 19}</span>` : ''
  const icon = L.divIcon({
    className: 'active-callout',
    html: `<div class="active-callout-box">${avatars}${more}</div>`,
    iconSize: [192, 184],
    iconAnchor: [24, 172],
  })
  const marker = L.marker(latLng, { icon, interactive: true })
  marker.on('click', () => openConWindow(con, map?.latLngToContainerPoint(latLng)))
  activeCalloutsLayer.addLayer(marker)
}

async function renderTrajectories() {
  if (!trajectoriesLayer) return
  clearTimeout(trajectoryHideTimer)
  clearTimeout(currentUserTrajectoryTimer)
  trajectoriesLayer.clearLayers()
  trajectoryLayersByUser.clear()
  if (!showTrajectories.value) return

  try {
    await loadTrajectoryUsers()
    const segmentCounts = collectSegmentCounts(trajectoryUsers.value)
    trajectoryUsers.value.forEach(user => drawUserTrajectory(user, segmentCounts))
  } catch (error) {
    console.warn('Failed to render trajectories:', error)
  }
}

async function loadTrajectoryUsers() {
  try {
    const res = await api.get('/users')
    trajectoryUsers.value = res.data.users || []
  } catch (error) {
    trajectoryUsers.value = []
    throw error
  }
  return trajectoryUsers.value
}

function collectSegmentCounts(users) {
  const segmentCounts = new Map()
  const context = trajectoryDisplayContext.value

  users.forEach(user => {
    const visits = getSortedTrajectoryVisits(user, context)
    visits.slice(0, -1).forEach((visit, index) => {
      const next = visits[index + 1]
      const key = `${visit.Con.id}->${next.Con.id}`
      segmentCounts.set(key, (segmentCounts.get(key) || 0) + 1)
    })
  })

  return segmentCounts
}

function getTrajectoryVisits(user) {
  if (Array.isArray(user.UserCons)) return user.UserCons
  if (Array.isArray(user.cons)) return user.cons
  return []
}

function canShowTrajectory(user) {
  return user?.show_con_history !== false && user?.show_on_homepage !== false
}

function getSortedTrajectoryVisits(user, context = trajectoryDisplayContext.value) {
  if (!canShowTrajectory(user)) return []

  const visits = getTrajectoryVisits(user)
    .map(visit => normalizeTrajectoryVisit(visit, context))
    .filter(Boolean)
    .sort(compareVisitsByConDate)

  return visits.filter((visit, index) => {
    if (index === 0) return true
    return visit.Con.id !== visits[index - 1].Con.id
  })
}

function normalizeTrajectoryVisit(visit, context) {
  const rawCon = visit.Con
  if (!rawCon || !context.sourceIds.has(rawCon.id)) return null

  const sourceCon = context.sourceConById.get(rawCon.id) || rawCon
  const actualCon = {
    ...sourceCon,
    ...rawCon,
    series_key: rawCon.series_key || sourceCon.series_key,
    series_name: rawCon.series_name || sourceCon.series_name,
  }

  if (!hasConCoordinates(actualCon)) return null

  let displayCon = null
  if (mergeConSeries.value) {
    const key = conSeriesKey(actualCon)
    displayCon = key ? context.representativeBySeries.get(key) : null
  }
  if (!displayCon && context.visibleIds.has(actualCon.id)) {
    displayCon = sourceCon
  }
  if (!hasConCoordinates(displayCon)) return null

  return {
    ...visit,
    Con: {
      ...actualCon,
      id: displayCon.id,
      name: displayCon.name || actualCon.name,
      latitude: displayCon.latitude,
      longitude: displayCon.longitude,
      city: displayCon.city || actualCon.city,
      theme_color: displayCon.theme_color || actualCon.theme_color,
      series_key: displayCon.series_key || actualCon.series_key,
      series_name: displayCon.series_name || actualCon.series_name,
    },
  }
}

function hasConCoordinates(con) {
  return Number.isFinite(Number(con?.latitude)) && Number.isFinite(Number(con?.longitude))
}

function getUserTrajectorySegments(user, segmentCounts) {
  const visits = getSortedTrajectoryVisits(user)
  if (visits.length < 2) return []

  return visits.slice(0, -1).map((visit, index) => {
    const next = visits[index + 1]
    const key = `${visit.Con.id}->${next.Con.id}`
    return {
      key,
      count: segmentCounts.get(key) || 1,
      color: user.theme_color || '#6C63FF',
      start: [Number(visit.Con.latitude), Number(visit.Con.longitude)],
      end: [Number(next.Con.latitude), Number(next.Con.longitude)],
    }
  })
}

function drawUserTrajectory(user, segmentCounts, animate = true) {
  if (!trajectoriesLayer || !showTrajectories.value) return []

  removeUserTrajectory(user.id, false)
  const layers = []

  getUserTrajectorySegments(user, segmentCounts).forEach(segment => {
    const curvePoints = generateCurve(segment.start, segment.end)
    const polyline = L.polyline(curvePoints, {
      color: segment.color,
      weight: Math.min(9, 2 + segment.count),
      opacity: myConIds.value.size ? 0.72 : 0.56,
      pane: TRAJECTORY_PANE,
      className: ['trajectory-line', animate ? 'trajectory-appear' : ''].filter(Boolean).join(' '),
    })
    polyline.bindTooltip(String(segment.count), {
      permanent: false,
      sticky: true,
      direction: 'top',
      offset: [0, -8],
      className: 'trajectory-tooltip',
    })
    trajectoriesLayer.addLayer(polyline)
    layers.push(polyline)

    const arrow = createArrow(curvePoints, segment.color, segment.count, animate)
    if (arrow) {
      trajectoriesLayer.addLayer(arrow)
      layers.push(arrow)
    }
  })

  trajectoryLayersByUser.set(user.id, layers)
  return layers
}

function removeUserTrajectory(userId, animated = true) {
  const layers = trajectoryLayersByUser.get(userId) || []
  trajectoryLayersByUser.delete(userId)
  if (!trajectoriesLayer || !layers.length) return

  if (!animated) {
    layers.forEach(layer => trajectoriesLayer.removeLayer(layer))
    return
  }

  layers.forEach(layer => {
    const element = layer.getElement?.()
    if (element) element.classList.add('trajectory-fade-out')
  })

  setTimeout(() => {
    layers.forEach(layer => trajectoriesLayer?.removeLayer(layer))
  }, 220)
}

function normalizeCurrentUserTrajectory(profile) {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    theme_color: profile.theme_color || authStore.user?.theme_color || '#6C63FF',
    show_con_history: authStore.user?.show_con_history ?? true,
    show_on_homepage: authStore.user?.show_on_homepage ?? true,
    UserCons: profile.cons || profile.UserCons || [],
  }
}

async function refreshCurrentUserTrajectory({ animate = true } = {}) {
  if (!authStore.user?.id || !trajectoriesLayer) return
  clearTimeout(currentUserTrajectoryTimer)

  try {
    const res = await api.get(`/users/${authStore.user.id}`)
    const currentUser = normalizeCurrentUserTrajectory(res.data.user)
    trajectoryUsers.value = trajectoryUsers.value.filter(user => user.id !== currentUser.id)
    if (canShowTrajectory(currentUser)) {
      trajectoryUsers.value.push(currentUser)
    }

    const segmentCounts = collectSegmentCounts(trajectoryUsers.value)
    removeUserTrajectory(currentUser.id, animate)
    if (hideNoTrajectoryNodes.value) {
      renderMarkers()
    }
    if (!showTrajectories.value || !canShowTrajectory(currentUser)) return

    const redraw = () => drawUserTrajectory(currentUser, segmentCounts, animate)
    if (animate) {
      currentUserTrajectoryTimer = setTimeout(redraw, 220)
    } else {
      redraw()
    }
  } catch (error) {
    console.warn('Failed to refresh current user trajectory:', error)
  }
}

function generateCurve(start, end) {
  const points = []
  const midLat = (start[0] + end[0]) / 2
  const midLng = (start[1] + end[1]) / 2
  const dx = end[1] - start[1]
  const dy = end[0] - start[0]
  const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.0001)
  const offset = dist * 0.18
  const offsetLat = midLat - (dx / dist) * offset
  const offsetLng = midLng + (dy / dist) * offset

  for (let step = 0; step <= 24; step++) {
    const t = step / 24
    const lat = ((1 - t) ** 2) * start[0] + 2 * (1 - t) * t * offsetLat + (t ** 2) * end[0]
    const lng = ((1 - t) ** 2) * start[1] + 2 * (1 - t) * t * offsetLng + (t ** 2) * end[1]
    points.push([lat, lng])
  }

  return points
}

function createArrow(points, color, count, animate = true) {
  const midIndex = Math.floor(points.length / 2)
  const before = points[midIndex - 1]
  const after = points[midIndex + 1]
  if (!before || !after || !map) return null

  const beforePoint = map.latLngToLayerPoint(before)
  const afterPoint = map.latLngToLayerPoint(after)
  const angle = Math.atan2(afterPoint.y - beforePoint.y, afterPoint.x - beforePoint.x) * 180 / Math.PI
  const arrowSize = Math.min(28, 18 + count)
  const safeColor = escapeHtml(color)
  const icon = L.divIcon({
    className: ['trajectory-arrow', animate ? 'trajectory-appear' : ''].filter(Boolean).join(' '),
    html: `<svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 24 24" style="transform:rotate(${angle}deg)"><path d="M18.5 12 7 5.5v13L18.5 12Z" fill="${safeColor}" /></svg>`,
    iconSize: [arrowSize, arrowSize],
    iconAnchor: [arrowSize / 2, arrowSize / 2],
  })
  return L.marker(points[midIndex], { icon, interactive: false, pane: TRAJECTORY_PANE })
}

function compareVisitsByConDate(a, b) {
  const aTime = new Date(a.Con?.start_date || 0).getTime()
  const bTime = new Date(b.Con?.start_date || 0).getTime()
  if (aTime !== bTime) return aTime - bTime
  return (a.visit_order || 0) - (b.visit_order || 0)
}

function conMatchesFilters(con) {
  return matchesRegion(con) && matchesDateRange(con)
}

function matchesDateRange(con) {
  const from = mapFilters.from ? new Date(`${mapFilters.from}T00:00:00`) : null
  const to = mapFilters.to ? new Date(`${mapFilters.to}T23:59:59`) : null
  const start = con.start_date ? new Date(`${con.start_date}T00:00:00`) : null
  const end = con.end_date ? new Date(`${con.end_date}T23:59:59`) : start

  if (!start || Number.isNaN(start.getTime())) return true
  if (from && end < from) return false
  if (to && start > to) return false
  return true
}

function matchesRegion(con) {
  if (mapFilters.region === 'all') return true
  const country = String(con.country || '').toLowerCase()
  const city = String(con.city || '').toLowerCase()
  const address = String(con.address || '').toLowerCase()
  const text = `${country} ${city} ${address}`
  const mainlandExcluded = ['香港', 'hong kong', '澳门', 'macau', '澳門', '台湾', 'taiwan', '台北', 'taipei']
  const mainlandCountries = ['中国', 'china', 'cn', 'prc']
  const asiaCountries = [
    '中国', 'china', '日本', 'japan', '韩国', 'south korea', 'korea', '新加坡', 'singapore',
    '马来西亚', 'malaysia', '泰国', 'thailand', '印度', 'india', '印度尼西亚', 'indonesia',
    '菲律宾', 'philippines', '越南', 'vietnam',
  ]

  if (mapFilters.region === 'mainland') {
    return mainlandCountries.some(item => text.includes(item)) && !mainlandExcluded.some(item => text.includes(item))
  }

  if (mapFilters.region === 'asia') {
    return asiaCountries.some(item => text.includes(item))
  }

  if (mapFilters.region === 'usa') {
    return ['usa', 'united states', '美国'].some(item => text.includes(item))
  }

  return true
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function loadMyCons() {
  if (!authStore.user?.id) {
    myConIds.value = new Set()
    return
  }

  try {
    const res = await api.get(`/users/${authStore.user.id}`)
    myConIds.value = new Set((res.data.user.cons || []).map(visit => visit.con_id))
  } catch (error) {
    myConIds.value = new Set()
  }
}

async function refreshMapData() {
  await loadMyCons()
  await consStore.fetchMapCons()
  if (showTrajectories.value || hideNoTrajectoryNodes.value) {
    try {
      await loadTrajectoryUsers()
    } catch (error) {
      console.warn('Failed to load trajectory users:', error)
    }
  }
  renderMarkers()
  if (showTrajectories.value) {
    const segmentCounts = collectSegmentCounts(trajectoryUsers.value)
    trajectoriesLayer?.clearLayers()
    trajectoryLayersByUser.clear()
    trajectoryUsers.value.forEach(user => drawUserTrajectory(user, segmentCounts))
  }
}

function toggleTrajectories() {
  if (showTrajectories.value) {
    showTrajectories.value = false
    fadeOutTrajectories()
    return
  }

  showTrajectories.value = true
  renderTrajectories()
}

function fadeOutTrajectories() {
  if (!trajectoriesLayer) return

  trajectoriesLayer.eachLayer(layer => {
    const element = layer.getElement?.()
    if (element) element.classList.add('trajectory-fade-out')
  })

  clearTimeout(trajectoryHideTimer)
  trajectoryHideTimer = setTimeout(() => {
    if (!showTrajectories.value) {
      trajectoriesLayer.clearLayers()
    }
  }, 220)
}

onMounted(async () => {
  initMap()
  window.addEventListener('pawport-profile-updated', handleProfileUpdated)
  window.addEventListener('pawport-attendance-updated', handleAttendanceUpdated)
  await nextTick()
  await refreshMapData()
})

onUnmounted(() => {
  stopDrag()
  clearTimeout(trajectoryHideTimer)
  clearTimeout(currentUserTrajectoryTimer)
  window.removeEventListener('pawport-profile-updated', handleProfileUpdated)
  window.removeEventListener('pawport-attendance-updated', handleAttendanceUpdated)
  if (map) {
    map.remove()
    map = null
  }
})

watch(() => consStore.mapCons, () => {
  renderMarkers()
}, { deep: true })

watch(mapFilters, () => {
  renderMarkers()
  renderTrajectories()
}, { deep: true })

watch(() => themeStore.darkMode, () => {
  applyTileTheme()
})

watch(() => themeStore.locale, () => {
  renderMapLabels()
})

watch(() => authStore.user?.id, async () => {
  if (!authStore.user?.id) {
    showOnlyMine.value = false
  }
  await refreshMapData()
})

watch(
  () => [
    authStore.user?.display_name,
    authStore.user?.avatar_url,
    authStore.user?.theme_color,
    authStore.user?.bio,
    authStore.user?.show_on_homepage,
    authStore.user?.show_con_history,
  ],
  () => {
    handleProfileUpdated()
  },
)
</script>

<style scoped lang="scss">
.home {
  height: 100%;
  position: relative;
  background: var(--bg);
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 800;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: min(920px, calc(100% - 210px));
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 0.85em;
  color: var(--text-secondary);
  transition: all var(--transition);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.control-btn:hover,
.control-btn.active {
  color: var(--user-primary, var(--primary));
  border-color: var(--user-primary, var(--primary));
}

.control-btn:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
}

.clear-btn {
  animation: control-pop 0.22s ease;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}

.filter-controls select,
.filter-controls input,
.filter-step,
.filter-reset {
  height: 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--bg);
  color: var(--text);
  padding: 0 10px;
  font: inherit;
  font-size: 0.8em;
}

.filter-controls input {
  width: 132px;
}

.filter-reset {
  cursor: pointer;
  color: var(--text-secondary);
}

.filter-step {
  min-width: 52px;
  cursor: pointer;
  font-weight: 700;
  color: var(--text-secondary);
}

.filter-step:hover {
  border-color: var(--user-primary, var(--primary));
  color: var(--user-primary, var(--primary));
}

.active-cons-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1100;
  appearance: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: color-mix(in srgb, var(--bg-card) 92%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow);
  color: var(--text);
  font-family: inherit;
  font-size: 0.85em;
  font-weight: 600;
  backdrop-filter: blur(14px);
  cursor: pointer;
  transition: transform var(--transition), border-color var(--transition);
}

.active-cons-badge:hover {
  transform: translateY(-1px);
  border-color: var(--user-primary, var(--primary));
}

.active-cons-badge.active {
  color: var(--user-primary, var(--primary));
  border-color: var(--user-primary, var(--primary));
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: #22C55E;
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
}

.window-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2000;
}

.map-window {
  position: absolute;
  width: min(360px, calc(100vw - 24px));
  max-height: min(640px, calc(100vh - 92px));
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-card) 94%, transparent);
  color: var(--text);
  border: 1px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 14px;
  box-shadow: var(--shadow-hover);
  backdrop-filter: blur(18px);
  pointer-events: auto;
  transform-origin: top center;
  transition: box-shadow 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.map-window.dragging {
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.24);
  transform: scale(1.015);
}

.window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  cursor: grab;
  user-select: none;
}

.window-header:active {
  cursor: grabbing;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.window-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.window-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.18em;
  line-height: 1;
  transition: transform 0.18s ease, background var(--transition), color var(--transition);
}

.window-close:hover {
  color: var(--text);
  transform: rotate(90deg) scale(1.08);
}

.window-body {
  padding: 16px;
  overflow-y: auto;
  max-height: calc(min(640px, 100vh - 92px) - 56px);
}

.con-summary {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 14px;
}

.con-summary h3,
.user-summary h3 {
  margin-bottom: 4px;
  font-size: 1.1em;
}

.con-summary p,
.user-summary p,
.history-item p {
  color: var(--text-secondary);
  font-size: 0.88em;
  line-height: 1.45;
}

.con-avatar,
.user-avatar,
.attendee-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: white;
  font-weight: 700;
}

.con-avatar {
  width: 56px;
  height: 42px;
  border-radius: 13px;
  border: 2px solid color-mix(in srgb, var(--border) 72%, transparent);
}

.con-avatar img,
.user-avatar img,
.attendee-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.active-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  padding: 5px 10px;
  background: color-mix(in srgb, #22C55E 16%, var(--bg-card));
  color: #15803D;
  border-radius: var(--radius-full);
  font-size: 0.82em;
  font-weight: 700;
}

.active-pill span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22C55E;
  animation: pulse-ring 2s infinite;
}

.meta-list,
.series-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}

.meta-list a,
.meta-list span,
.series-chip {
  padding: 5px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  text-decoration: none;
  border: 1px solid transparent;
  font-size: 0.82em;
}

.series-chip {
  cursor: pointer;
}

.series-chip.active {
  border-color: var(--user-primary, var(--primary));
  color: var(--user-primary, var(--primary));
}

.section-label {
  color: var(--text-secondary);
  font-size: 0.78em;
  font-weight: 700;
  text-transform: uppercase;
}

.hotel-stats {
  margin-top: 14px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.hotel-stats-head,
.hotel-stats-body,
.hotel-legend-item {
  display: flex;
  align-items: center;
}

.hotel-stats-head {
  justify-content: space-between;
  margin-bottom: 10px;

  strong {
    color: var(--text-secondary);
    font-size: 0.82em;
  }
}

.hotel-stats-body {
  gap: 12px;
}

.hotel-pie {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 8px color-mix(in srgb, var(--bg-card) 88%, transparent);
  flex: 0 0 auto;
}

.hotel-legend {
  display: grid;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.hotel-legend-item {
  gap: 6px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.78em;
}

.hotel-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.hotel-legend-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hotel-legend-count {
  flex: 0 0 auto;
  font-weight: 700;
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

.attendee-section h4,
.history-list h4 {
  color: var(--text-secondary);
  font-size: 0.86em;
  margin-bottom: 10px;
}

.attendee-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px 8px;
}

.attendee-item {
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: grid;
  gap: 4px;
  justify-items: center;
}

.attendee-item:hover .attendee-avatar {
  transform: scale(1.1);
}

.attendee-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  font-size: 0.82em;
  transition: transform var(--transition);
}

.attendee-name {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72em;
}

.attendee-more {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.76em;
  font-weight: 700;
}

.window-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  border: none;
  border-radius: var(--radius-full);
  padding: 9px 13px;
  cursor: pointer;
  font-weight: 700;
}

.btn-primary {
  background: var(--user-primary, var(--primary));
  color: white;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.user-summary {
  text-align: center;
  margin-bottom: 16px;
}

.user-avatar {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  margin: 0 auto 10px;
  font-size: 1.6em;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 9px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.history-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 5px;
}

.hotel-line {
  margin-top: 3px;
}

.muted,
.loading-row {
  color: var(--text-secondary);
}

@keyframes jelly-in {
  from {
    opacity: 0;
    transform: scale(0.82) translateY(10px);
  }
  70% {
    transform: scale(1.02) translateY(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes control-pop {
  from {
    transform: scale(0.94);
  }
  to {
    transform: scale(1);
  }
}

.window-stack-enter-active {
  animation: jelly-in 0.3s cubic-bezier(0.2, 0.9, 0.2, 1.2);
}

.window-stack-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.window-stack-enter-from,
.window-stack-leave-to {
  opacity: 0;
  transform: scale(0.86) translateY(12px);
}

:global(.con-marker) {
  background: transparent !important;
  border: none !important;
}

:global(.marker-wrapper) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

:global(.marker-wrapper.active .marker-pulse) {
  position: absolute;
  inset: 8px;
  border-radius: 18px;
  border: 2px solid;
  animation: pulse-ring 2s infinite;
}

:global(.marker-wrapper.mine::after) {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--user-primary, var(--primary));
  border-radius: 20px;
}

:global(.marker-card) {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: 13px;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #5A6475;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
  transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.2, 1.25), border-radius 0.25s ease;
  animation: marker-liquid-in 0.32s cubic-bezier(0.2, 0.9, 0.2, 1.24);
}

:global(.marker-card:hover) {
  transform: scale(1.16);
  border-radius: 18px;
}

:global(.marker-media) {
  position: absolute;
  inset: 3px;
  z-index: 0;
  overflow: hidden;
  border-radius: 9px;
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
}

:global(.marker-card:hover .marker-media) {
  border-radius: 14px;
}

:global(.marker-label) {
  position: relative;
  z-index: 1;
}

:global(.active-callout) {
  background: transparent !important;
  border: none !important;
}

:global(.active-callout-box) {
  display: grid;
  grid-template-columns: repeat(5, 24px);
  gap: 5px;
  width: max-content;
  padding: 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.32);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(12px);
  transform-origin: bottom left;
  animation: callout-float-in 0.24s cubic-bezier(0.2, 0.9, 0.2, 1.15);
  position: relative;
  padding-top: 16px;
}

:global(.active-callout-box::after) {
  content: '';
  position: absolute;
  left: 18px;
  bottom: -7px;
  width: 12px;
  height: 12px;
  background: inherit;
  border-right: 1px solid rgba(148, 163, 184, 0.32);
  border-bottom: 1px solid rgba(148, 163, 184, 0.32);
  transform: rotate(45deg);
}

:global(.dark .active-callout-box) {
  background: rgba(30, 41, 59, 0.88);
}

:global(.callout-avatar) {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 800;
  overflow: hidden;
}

:global(.callout-avatar img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:global(.callout-avatar.more) {
  background: #64748B;
}

:global(.trajectory-line) {
  stroke-linecap: round;
  filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.18));
}

:global(.trajectory-appear) {
  animation: trajectory-fade-in 0.22s ease both;
}

:global(.trajectory-fade-out) {
  animation: trajectory-fade-out 0.22s ease both;
}

:global(.trajectory-arrow) {
  background: transparent !important;
  border: none !important;
}

:global(.trajectory-arrow svg) {
  display: block;
  transform-origin: center;
  filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.24));
}

:global(.trajectory-tooltip) {
  border: none;
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text);
  box-shadow: var(--shadow);
  font-weight: 800;
}

:global(.screenshot-avatar-frame) {
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 1300;
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(330px, calc(100% - 44px));
  min-height: 90px;
  padding: 13px 15px;
  border: 1.5px solid var(--user-primary, var(--primary));
  border-radius: 22px;
  background: color-mix(in srgb, var(--bg-card) 88%, transparent);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

:global(.screenshot-avatar) {
  position: relative;
  flex: 0 0 62px;
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  border: 4px solid #FFFFFF;
  border-radius: 50%;
  color: #FFFFFF;
  font-size: 1.55em;
  font-weight: 900;
  overflow: hidden;
}

:global(.screenshot-avatar-label) {
  position: relative;
  z-index: 1;
}

:global(.screenshot-avatar-text) {
  min-width: 0;
  display: grid;
  gap: 5px;
}

:global(.screenshot-avatar-text strong),
:global(.screenshot-avatar-text small) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.screenshot-avatar-text strong) {
  color: var(--text);
  font-size: 1.08em;
}

:global(.screenshot-avatar-text small) {
  color: var(--text-secondary);
  font-size: 0.76em;
  font-weight: 700;
}

:global(.map-label) {
  background: transparent !important;
  border: none !important;
  pointer-events: none;
}

:global(.map-label span) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  transform: translateX(-50%);
  color: rgba(15, 23, 42, 0.68);
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9), 0 -1px 3px rgba(255, 255, 255, 0.9);
  font-weight: 700;
  letter-spacing: 0;
  white-space: nowrap;
}

:global(.country-label span) {
  font-size: 13px;
}

:global(.city-label span) {
  font-size: 11px;
}

:global(.city-label span::before) {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 4px;
}

:global(.dark .map-label span) {
  color: rgba(241, 245, 249, 0.78);
  text-shadow: 0 1px 3px rgba(15, 23, 42, 0.9), 0 -1px 3px rgba(15, 23, 42, 0.9);
}

@keyframes marker-liquid-in {
  from {
    transform: scale(0.72);
    border-radius: 22px;
  }
  to {
    transform: scale(1);
    border-radius: 13px;
  }
}

@keyframes callout-float-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes trajectory-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes trajectory-fade-out {
  to {
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .map-controls {
    top: 12px;
    left: 12px;
    right: 12px;
    max-width: none;
  }

  .filter-controls {
    width: 100%;
    border-radius: 16px;
    flex-wrap: wrap;
  }

  .filter-controls select,
  .filter-controls input,
  .filter-step,
  .filter-reset {
    flex: 1;
    min-width: 0;
  }

  .active-cons-badge {
    top: auto;
    right: 12px;
    bottom: 18px;
  }

  .map-window {
    left: 0 !important;
    top: 0 !important;
    width: 100%;
    max-height: 100%;
    height: 100%;
    border-radius: 0;
  }

  .window-body {
    max-height: calc(100% - 56px);
  }
}
</style>
