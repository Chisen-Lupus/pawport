<template>
  <div class="con-detail" v-if="con">
    <section class="con-header" :style="{ borderColor: con.theme_color || '#6C63FF' }">
      <div class="con-icon" :style="{ background: con.theme_color || '#6C63FF' }">
        <img v-if="con.poster_url || con.avatar_url" :src="con.poster_url || con.avatar_url" alt="" />
        <span v-else>{{ con.name?.[0] || '?' }}</span>
      </div>
      <div class="con-heading">
        <h2>{{ con.name }}</h2>
        <p>{{ con.start_date }} - {{ con.end_date }}</p>
        <p v-if="shouldShowVenueLine(con)">{{ [con.venue, con.city].filter(Boolean).join(' · ') }}</p>
        <p v-if="con.address" class="muted">{{ con.address }}</p>
      </div>
    </section>

    <section class="con-body">
      <p v-if="con.description" class="description">{{ con.description }}</p>
      <a v-if="con.website" class="source-link" :href="con.website" target="_blank" rel="noopener">
        {{ $t('con.website') }}
      </a>

      <div v-if="series.length > 1" class="series-strip">
        <span class="section-label">{{ con.series_name || con.series_key }}</span>
        <button
          v-for="edition in series"
          :key="edition.id"
          class="series-chip"
          :class="{ active: edition.id === con.id }"
          @click="openEdition(edition.id)"
        >
          {{ edition.edition_label || new Date(edition.start_date).getFullYear() }}
        </button>
      </div>

      <div v-if="hotelStats.hotels?.length" class="hotel-stats">
        <div class="hotel-stats-head">
          <span class="section-label">{{ $t('hotel.distribution') }}</span>
          <strong>{{ hotelStats.total }}</strong>
        </div>
        <div class="hotel-stats-body">
          <div class="hotel-pie" :style="{ background: hotelPieBackground(hotelStats.hotels) }"></div>
          <div class="hotel-legend">
            <div v-for="hotel in hotelStats.hotels" :key="`${hotel.name}-${hotel.address}`" class="hotel-legend-item">
              <span class="hotel-legend-dot" :style="{ background: hotel.color }"></span>
              <span class="hotel-legend-name">{{ hotel.name }}</span>
              <span class="hotel-legend-count">{{ hotel.count }} · {{ hotel.percent }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConsStore } from '@/stores/cons'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const consStore = useConsStore()
const con = ref(null)
const series = ref([])
const hotelStats = ref({ total: 0, hotels: [] })

async function loadCon(id) {
  con.value = await consStore.fetchCon(id)
  await Promise.all([fetchSeries(), fetchHotelStats(id)])
}

async function fetchSeries() {
  if (!con.value?.series_key) {
    series.value = []
    return
  }

  try {
    const res = await api.get(`/cons/series/${encodeURIComponent(con.value.series_key)}`)
    series.value = res.data.cons || []
  } catch (error) {
    series.value = []
  }
}

async function fetchHotelStats(id) {
  try {
    const res = await api.get(`/cons/${id}/hotel-stats`)
    hotelStats.value = res.data
  } catch (error) {
    hotelStats.value = { total: 0, hotels: [] }
  }
}

function openEdition(id) {
  if (id === con.value?.id) return
  router.replace(`/con/${id}`)
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

function shouldShowVenueLine(conInfo) {
  if (!conInfo?.venue) return false
  const venue = normalizeDisplayText(conInfo.venue)
  const address = normalizeDisplayText(conInfo.address)
  if (!venue) return false
  if (!address) return true
  return !address.includes(venue) && !venue.includes(address)
}

function normalizeDisplayText(value = '') {
  return String(value).replace(/\s+/g, '').trim().toLowerCase()
}

watch(() => route.params.id, id => {
  if (id) loadCon(id)
}, { immediate: true })
</script>

<style scoped lang="scss">
.con-detail {
  max-width: 760px;
  margin: 40px auto;
  padding: 0 20px;
}

.con-header {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 18px;
  align-items: center;
  padding: 22px;
  border: 1px solid;
  border-top-width: 4px;
  border-radius: var(--radius);
  background: var(--bg-card);
  box-shadow: var(--shadow);
  margin-bottom: 20px;
}

.con-icon {
  width: 104px;
  height: 78px;
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2em;
  font-weight: 800;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.con-heading {
  min-width: 0;

  h2 {
    margin-bottom: 8px;
    font-size: 1.6em;
  }

  p {
    color: var(--text-secondary);
    line-height: 1.45;
  }
}

.con-body {
  padding: 20px;
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  box-shadow: var(--shadow);
}

.description {
  margin-bottom: 14px;
  line-height: 1.6;
}

.source-link,
.series-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  text-decoration: none;
  font: inherit;
  font-size: 0.86em;
  cursor: pointer;
}

.source-link:hover,
.series-chip:hover,
.series-chip.active {
  color: var(--user-primary, var(--primary));
  border-color: var(--user-primary, var(--primary));
}

.series-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.section-label {
  color: var(--text-secondary);
  font-size: 0.78em;
  font-weight: 700;
  text-transform: uppercase;
}

.hotel-stats {
  margin-top: 18px;
  padding: 14px;
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
  margin-bottom: 12px;

  strong {
    color: var(--text-secondary);
    font-size: 0.86em;
  }
}

.hotel-stats-body {
  gap: 14px;
}

.hotel-pie {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 10px color-mix(in srgb, var(--bg-card) 88%, transparent);
  flex: 0 0 auto;
}

.hotel-legend {
  display: grid;
  gap: 7px;
  min-width: 0;
  flex: 1;
}

.hotel-legend-item {
  gap: 7px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.84em;
}

.hotel-legend-dot {
  width: 9px;
  height: 9px;
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

.muted {
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .con-detail {
    margin: 18px auto;
    padding: 0 12px;
  }

  .con-header {
    grid-template-columns: 1fr;
  }

  .con-icon {
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 3;
  }
}
</style>
