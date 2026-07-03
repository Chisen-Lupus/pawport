const axios = require('axios');

require('../utils/loadEnv')();

const appConfig = require('../../config/app.config');
const secretsConfig = require('../../config/secrets.config');
const { Con } = require('../database/init');

const FCC_BASE_URL = String(appConfig.fcc.baseUrl || 'https://api.furrycons.cn/open').replace(/\/+$/, '');
const FCC_LIST_PATH = appConfig.fcc.listPath || '/event';
const FCC_CALENDAR_PATH = appConfig.fcc.calendarPath || '/event/recent';
const FCC_DETAIL_PATH = appConfig.fcc.detailPath || '/event';
const FCC_TOKEN = secretsConfig.fcc.token;

const CITY_COORDINATES = {
  北京: [39.9042, 116.4074],
  上海: [31.2304, 121.4737],
  广州: [23.1291, 113.2644],
  深圳: [22.5431, 114.0579],
  成都: [30.5728, 104.0668],
  武汉: [30.5928, 114.3055],
  佛山: [23.0215, 113.1214],
  淄博: [36.8135, 118.055],
  绵阳: [31.4675, 104.6796],
  徐州: [34.2044, 117.2858],
  咸宁: [29.8413, 114.3225],
  杭州: [30.2741, 120.1551],
  南京: [32.0603, 118.7969],
  苏州: [31.2989, 120.5853],
  宁波: [29.8683, 121.544],
  台州: [28.6564, 121.4208],
  东莞: [23.0207, 113.7518],
  惠州: [23.1115, 114.4152],
  温州: [27.9938, 120.6994],
  常州: [31.8107, 119.9737],
  天津: [39.3434, 117.3616],
  重庆: [29.563, 106.5516],
  西安: [34.3416, 108.9398],
  汉中: [33.0675, 107.0232],
  洛阳: [34.6197, 112.454],
  保定: [38.8737, 115.4646],
  唐山: [39.6305, 118.1806],
  淮安: [33.6104, 119.0153],
  郑州: [34.7466, 113.6254],
  长沙: [28.2282, 112.9388],
  厦门: [24.4798, 118.0894],
  福州: [26.0745, 119.2965],
  青岛: [36.0671, 120.3826],
  济南: [36.6512, 117.1201],
  济宁: [35.4149, 116.5872],
  滨州: [37.3835, 117.9707],
  枣庄: [34.8105, 117.3238],
  合肥: [31.8206, 117.2272],
  南昌: [28.682, 115.8579],
  南宁: [22.817, 108.3669],
  昆明: [25.0389, 102.7183],
  贵阳: [26.647, 106.6302],
  沈阳: [41.8057, 123.4315],
  大连: [38.914, 121.6147],
  哈尔滨: [45.8038, 126.5349],
  长春: [43.8171, 125.3235],
  白山: [41.944, 126.4236],
  延边: [42.8913, 129.5091],
  石家庄: [38.0428, 114.5149],
  太原: [37.8706, 112.5489],
  呼和浩特: [40.8426, 111.7492],
  鄂尔多斯: [39.6086, 109.7816],
  乌鲁木齐: [43.8256, 87.6168],
  兰州: [36.0611, 103.8343],
  银川: [38.4872, 106.2309],
  西宁: [36.6171, 101.7782],
  拉萨: [29.652, 91.1721],
  海口: [20.044, 110.1999],
  三亚: [18.2528, 109.512],
  鄂州: [30.3919, 114.8948],
  泸州: [28.8718, 105.4423],
  凯里: [26.5662, 107.9804],
  黔东南: [26.5834, 107.9774],
  香港: [22.3193, 114.1694],
  澳门: [22.1987, 113.5439],
  台北: [25.033, 121.5654],
  新北: [25.0169, 121.4628],
  桃园: [24.9936, 121.301],
  新竹: [24.8138, 120.9675],
  台中: [24.1477, 120.6736],
  台南: [22.9999, 120.2269],
  高雄: [22.6273, 120.3014],
  南投: [23.9609, 120.9719],
  南港: [25.0553, 121.607],
};

function buildSeriesKey(event) {
  const source = event.organization?.slug
    || event.organization?.name
    || event.seriesName
    || event.name
    || event.slug
    || event.id;

  return String(source)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function fccHeaders() {
  const headers = { Accept: 'application/json' };
  if (FCC_TOKEN) {
    // The FurryCons notebook passes the token directly, without a "Bearer " prefix.
    headers.Authorization = FCC_TOKEN;
  }
  return headers;
}

async function fccGet(path, params = {}) {
  const response = await axios.get(`${FCC_BASE_URL}${path}`, {
    headers: fccHeaders(),
    params,
    timeout: 30000,
  });

  return response.data;
}

function unwrapEvents(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.list)) return payload.data.list;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

function payloadPageInfo(payload) {
  return {
    total: Number(payload?.total || payload?.data?.total || 0),
    current: Number(payload?.current || payload?.data?.current || 1),
    pageSize: Number(payload?.pageSize || payload?.data?.pageSize || 0),
  };
}

function unwrapDetail(payload) {
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload || {};
}

async function fetchRecentEvents() {
  const keepOld = appConfig.fcc.keepOld ?? true;
  return fccGet(FCC_CALENDAR_PATH, { keepOld: String(keepOld).toLowerCase() });
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function syncDateRange() {
  const now = new Date();
  const pastMonths = Number(appConfig.fcc.syncPastMonths ?? 18);
  const futureMonths = Number(appConfig.fcc.syncFutureMonths ?? 18);
  const from = appConfig.fcc.syncFrom || addMonths(now, -pastMonths).toISOString();
  const to = appConfig.fcc.syncTo || addMonths(now, futureMonths).toISOString();
  return { from, to };
}

async function fetchPagedEvents() {
  const events = [];
  const pageSize = Number(appConfig.fcc.pageSize || 100);
  const maxPages = Number(appConfig.fcc.maxPages || 20);
  const { from, to } = syncDateRange();

  for (let current = 1; current <= maxPages; current++) {
    const payload = await fccGet(FCC_LIST_PATH, {
      current,
      pageSize,
      eventStartAt: from,
      eventEndAt: to,
    });
    const pageEvents = unwrapEvents(payload);
    const pageInfo = payloadPageInfo(payload);
    events.push(...pageEvents);

    if (!pageEvents.length) break;
    if (pageInfo.total && events.length >= pageInfo.total) break;
    if (pageInfo.pageSize && pageEvents.length < pageInfo.pageSize) break;
  }

  return { events, from, to };
}

async function fetchCalendarEvents() {
  if (FCC_LIST_PATH) {
    return fetchPagedEvents();
  }

  const payload = await fetchRecentEvents();
  return { events: unwrapEvents(payload), from: null, to: null };
}

async function fetchEventDetail(eventId) {
  if (!eventId) return null;
  const payload = await fccGet(`${FCC_DETAIL_PATH}/${encodeURIComponent(eventId)}`);
  return unwrapDetail(payload);
}

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function dateOnly(value) {
  if (!value) return null;
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function numericValue(...values) {
  const raw = firstValue(...values);
  if (raw === undefined) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function normalizePlace(value = '') {
  return String(value)
    .replace(/\s+/g, '')
    .replace(/[省市区县]/g, '')
    .toLowerCase();
}

function fallbackCoordinates(event) {
  const candidates = [
    event.city,
    event.region,
    event.address,
    event.fullAddress,
    event.venue,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizePlace(candidate);
    const exact = Object.entries(CITY_COORDINATES).find(([city]) => (
      normalizePlace(city) === normalizedCandidate
    ));
    if (exact) return { latitude: exact[1][0], longitude: exact[1][1], precision: 'city' };

    const included = Object.entries(CITY_COORDINATES).find(([city]) => (
      normalizedCandidate.includes(normalizePlace(city))
    ));
    if (included) return { latitude: included[1][0], longitude: included[1][1], precision: 'city' };
  }

  return null;
}

function buildDisplayName(event) {
  const organizationName = event.organization?.name;
  const eventName = firstValue(event.name, event.title);

  if (organizationName && eventName && organizationName !== eventName) {
    return `${organizationName} ${eventName}`;
  }

  return firstValue(eventName, organizationName, event.slug, event.id);
}

function buildAddress(event) {
  const region = firstValue(event.region, event.city);
  const address = firstValue(event.address, event.fullAddress, event.venue);

  if (!region) return address || null;
  if (!address) return region;
  if (String(address).includes(region)) return address;
  return `${region} ${address}`;
}

function mergeEvent(listEvent, detailEvent) {
  const detail = detailEvent || {};
  return {
    ...listEvent,
    ...detail,
    organization: detail.organization || listEvent.organization,
  };
}

function mapEventToConData(listEvent, detailEvent = null) {
  const event = mergeEvent(listEvent, detailEvent);
  const organizationName = event.organization?.name;
  const displayName = buildDisplayName(event);
  const startDate = dateOnly(firstValue(event.startDate, event.start_date, event.eventStartAt));
  const endDate = dateOnly(firstValue(event.endDate, event.end_date, event.eventEndAt)) || startDate;
  const thumbnail = firstValue(event.thumbnail, event.posterUrl, event.poster, event.cover);
  const organizationLogo = event.organization?.logoUrl;
  const exactLatitude = numericValue(event.latitude, event.lat, event.location?.latitude, event.location?.lat, event.geo?.lat);
  const exactLongitude = numericValue(event.longitude, event.lng, event.location?.longitude, event.location?.lng, event.geo?.lng);
  const fallback = exactLatitude === null || exactLongitude === null ? fallbackCoordinates(event) : null;
  const latitude = exactLatitude ?? fallback?.latitude ?? null;
  const longitude = exactLongitude ?? fallback?.longitude ?? null;

  return {
    name: displayName,
    name_en: firstValue(event.nameEn, event.name_en),
    name_local: firstValue(event.localName, event.nameLocal, displayName),
    series_key: buildSeriesKey(event),
    series_name: firstValue(organizationName, event.seriesName, displayName),
    edition_label: firstValue(event.name, event.title, event.slug),
    start_date: startDate,
    end_date: endDate,
    venue: firstValue(event.venue, event.address, event.region),
    city: firstValue(event.city, event.region),
    country: firstValue(event.country, '中国'),
    address: buildAddress(event),
    latitude,
    longitude,
    poster_url: thumbnail,
    avatar_url: firstValue(thumbnail, event.avatarUrl, event.logo, organizationLogo),
    theme: firstValue(event.theme, event.slogan, organizationName && event.name ? event.name : null),
    website: firstValue(event.website, event.officialUrl, event.url, event.organization?.url),
    description: firstValue(event.description, event.intro, event.detail),
    fcc_id: String(event.id),
    fcc_slug: event.slug || null,
    status: 'approved',
    is_test: false,
    extra_fields: {
      source: 'fcc',
      sourceUrl: event.url || null,
      fccSyncedAt: new Date().toISOString(),
      locationPrecision: exactLatitude !== null && exactLongitude !== null ? 'exact' : fallback?.precision || 'unknown',
      scale: event.scale || null,
      eventStatus: event.status || null,
      organization: event.organization || null,
      region: event.region || null,
    },
  };
}

async function upsertCon(conData) {
  const [con, wasCreated] = await Con.findOrCreate({
    where: { fcc_id: conData.fcc_id },
    defaults: conData,
  });

  if (wasCreated) {
    return 'created';
  }

  await con.update({
    name: conData.name,
    name_en: conData.name_en || con.name_en,
    name_local: conData.name_local || con.name_local,
    series_key: conData.series_key || con.series_key,
    series_name: conData.series_name || con.series_name,
    edition_label: conData.edition_label || con.edition_label,
    start_date: conData.start_date,
    end_date: conData.end_date,
    venue: conData.venue || con.venue,
    city: conData.city || con.city,
    country: conData.country || con.country,
    address: conData.address || con.address,
    latitude: conData.latitude ?? con.latitude,
    longitude: conData.longitude ?? con.longitude,
    poster_url: conData.poster_url || con.poster_url,
    avatar_url: conData.avatar_url || con.avatar_url,
    theme: conData.theme || con.theme,
    website: conData.website || con.website,
    description: conData.description || con.description,
    fcc_slug: conData.fcc_slug || con.fcc_slug,
    extra_fields: {
      ...(con.extra_fields || {}),
      ...(conData.extra_fields || {}),
    },
  });

  return 'updated';
}

async function syncFCC() {
  if (!appConfig.features.enableFCCSync) {
    console.log('⏭️ FCC sync is disabled');
    return { skipped: true, reason: 'feature-disabled' };
  }

  if (!FCC_TOKEN) {
    console.log('⏭️ FCC sync skipped: FCC_TOKEN or FURRYCONS_API_KEY is not configured');
    return { skipped: true, reason: 'missing-token' };
  }

  const stats = {
    fetched: 0,
    detailed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    console.log('🔄 Starting FCC calendar sync...');
    const { events, from, to } = await fetchCalendarEvents();
    stats.fetched = events.length;
    const rangeLabel = from && to ? ` (${from.slice(0, 10)} to ${to.slice(0, 10)})` : '';
    console.log(`  📥 Fetched ${events.length} calendar events from FCC${rangeLabel}`);

    for (const listEvent of events) {
      try {
        let detailEvent = null;
        if (appConfig.fcc.fetchDetails === true) {
          try {
            detailEvent = await fetchEventDetail(listEvent.id);
            stats.detailed++;
          } catch (detailError) {
            console.warn(`  ⚠️ Detail fetch failed for ${listEvent.id}: ${detailError.message}`);
          }
        }

        const conData = mapEventToConData(listEvent, detailEvent);
        if (!conData.fcc_id || !conData.name || !conData.start_date || !conData.end_date) {
          stats.skipped++;
          continue;
        }

        const result = await upsertCon(conData);
        stats[result]++;
      } catch (eventError) {
        stats.failed++;
        console.error(`  ⚠️ Error processing FCC event ${listEvent.id}:`, eventError.message);
      }
    }

    console.log(`  ✅ FCC calendar sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed`);
    return stats;
  } catch (error) {
    console.error('❌ FCC calendar sync failed:', error.message);
    if (error.response) {
      console.error('  Response status:', error.response.status);
      console.error('  Response data:', JSON.stringify(error.response.data).substring(0, 200));
    }
    throw error;
  }
}

// Run directly
if (require.main === module) {
  syncFCC().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = {
  syncFCC,
  mapEventToConData,
  unwrapEvents,
};
