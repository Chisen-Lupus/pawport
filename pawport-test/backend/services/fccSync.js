const axios = require('axios');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const appConfig = require('../../config/app.config');
const secretsConfig = require('../../config/secrets.config');
const { Con } = require('../database/init');

const FCC_BASE_URL = String(appConfig.fcc.baseUrl || 'https://api.furrycons.cn/open').replace(/\/+$/, '');
const FCC_CALENDAR_PATH = appConfig.fcc.calendarPath || '/event/recent';
const FCC_DETAIL_PATH = appConfig.fcc.detailPath || '/event';
const FCC_TOKEN = secretsConfig.fcc.token;

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

function unwrapDetail(payload) {
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload || {};
}

async function fetchRecentEvents() {
  const keepOld = appConfig.fcc.keepOld ?? true;
  return fccGet(FCC_CALENDAR_PATH, { keepOld: String(keepOld).toLowerCase() });
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
    latitude: numericValue(event.latitude, event.lat, event.location?.latitude, event.location?.lat, event.geo?.lat),
    longitude: numericValue(event.longitude, event.lng, event.location?.longitude, event.location?.lng, event.geo?.lng),
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
    const payload = await fetchRecentEvents();
    const events = unwrapEvents(payload);
    stats.fetched = events.length;
    console.log(`  📥 Fetched ${events.length} calendar events from FCC`);

    for (const listEvent of events) {
      try {
        let detailEvent = null;
        if (appConfig.fcc.fetchDetails !== false) {
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
