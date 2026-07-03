const axios = require('axios');

require('../utils/loadEnv')();

const appConfig = require('../../config/app.config');
const { Con } = require('../database/init');

const SOURCE = 'furrycons.com';
const SOURCE_PREFIX = 'furrycons.com:';
const DEFAULT_THEME_COLOR = '#6C63FF';

const COUNTRY_COORDINATES = {
  Argentina: [-34.6037, -58.3816],
  Australia: [-25.2744, 133.7751],
  Austria: [47.5162, 14.5501],
  Belgium: [50.5039, 4.4699],
  Brazil: [-14.235, -51.9253],
  Canada: [56.1304, -106.3468],
  Chile: [-35.6751, -71.543],
  China: [35.8617, 104.1954],
  Croatia: [45.1, 15.2],
  'Czech Republic': [49.8175, 15.473],
  Denmark: [56.2639, 9.5018],
  Estonia: [58.5953, 25.0136],
  Finland: [61.9241, 25.7482],
  France: [46.2276, 2.2137],
  Germany: [51.1657, 10.4515],
  Hungary: [47.1625, 19.5033],
  Ireland: [53.4129, -8.2439],
  Italy: [41.8719, 12.5674],
  Japan: [36.2048, 138.2529],
  Mexico: [23.6345, -102.5528],
  Netherlands: [52.1326, 5.2913],
  Norway: [60.472, 8.4689],
  Poland: [51.9194, 19.1451],
  Portugal: [39.3999, -8.2245],
  Slovenia: [46.1512, 14.9955],
  Spain: [40.4637, -3.7492],
  Sweden: [60.1282, 18.6435],
  Switzerland: [46.8182, 8.2275],
  Taiwan: [23.6978, 120.9605],
  Thailand: [15.87, 100.9925],
  UK: [55.3781, -3.436],
  USA: [39.8283, -98.5795],
};

const US_STATE_COORDINATES = {
  AL: [32.8067, -86.7911],
  AK: [61.3707, -152.4044],
  AZ: [33.7298, -111.4312],
  AR: [34.9697, -92.3731],
  CA: [36.1162, -119.6816],
  CO: [39.0598, -105.3111],
  CT: [41.5978, -72.7554],
  DE: [39.3185, -75.5071],
  FL: [27.7663, -81.6868],
  GA: [33.0406, -83.6431],
  HI: [21.0943, -157.4983],
  ID: [44.2405, -114.4788],
  IL: [40.3495, -88.9861],
  IN: [39.8494, -86.2583],
  IA: [42.0115, -93.2105],
  KS: [38.5266, -96.7265],
  KY: [37.6681, -84.6701],
  LA: [31.1695, -91.8678],
  ME: [44.6939, -69.3819],
  MD: [39.0639, -76.8021],
  MA: [42.2302, -71.5301],
  MI: [43.3266, -84.5361],
  MN: [45.6945, -93.9002],
  MS: [32.7416, -89.6787],
  MO: [38.4561, -92.2884],
  MT: [46.9219, -110.4544],
  NE: [41.1254, -98.2681],
  NV: [38.3135, -117.0554],
  NH: [43.4525, -71.5639],
  NJ: [40.2989, -74.521],
  NM: [34.8405, -106.2485],
  NY: [42.1657, -74.9481],
  NC: [35.6301, -79.8064],
  ND: [47.5289, -99.784],
  OH: [40.3888, -82.7649],
  OK: [35.5653, -96.9289],
  OR: [44.572, -122.0709],
  PA: [40.5908, -77.2098],
  RI: [41.6809, -71.5118],
  SC: [33.8569, -80.945],
  SD: [44.2998, -99.4388],
  TN: [35.7478, -86.6923],
  TX: [31.0545, -97.5635],
  UT: [40.15, -111.8624],
  VT: [44.0459, -72.7107],
  VA: [37.7693, -78.17],
  WA: [47.4009, -121.4905],
  WV: [38.4912, -80.9545],
  WI: [44.2685, -89.6165],
  WY: [42.756, -107.3025],
  DC: [38.9072, -77.0369],
};

const CANADA_REGION_COORDINATES = {
  Alberta: [53.9333, -116.5765],
  'British Columbia': [53.7267, -127.6476],
  Manitoba: [53.7609, -98.8139],
  'New Brunswick': [46.5653, -66.4619],
  Newfoundland: [53.1355, -57.6604],
  'Nova Scotia': [44.682, -63.7443],
  Ontario: [51.2538, -85.3232],
  Quebec: [52.9399, -73.5491],
  Saskatchewan: [52.9399, -106.4509],
};

const CITY_COORDINATES = {
  Amsterdam: [52.3676, 4.9041],
  Antwerp: [51.2194, 4.4025],
  Austin: [30.2672, -97.7431],
  Bangkok: [13.7563, 100.5018],
  Berlin: [52.52, 13.405],
  Boston: [42.3601, -71.0589],
  Chicago: [41.8781, -87.6298],
  Dallas: [32.7767, -96.797],
  Denver: [39.7392, -104.9903],
  Detroit: [42.3314, -83.0458],
  Dublin: [53.3498, -6.2603],
  Frankfurt: [50.1109, 8.6821],
  Helsinki: [60.1699, 24.9384],
  London: [51.5072, -0.1276],
  'Los Angeles': [34.0522, -118.2437],
  Malmö: [55.605, 13.0038],
  Melbourne: [-37.8136, 144.9631],
  Montreal: [45.5017, -73.5673],
  Orlando: [28.5383, -81.3792],
  Paris: [48.8566, 2.3522],
  Philadelphia: [39.9526, -75.1652],
  Pittsburgh: [40.4406, -79.9959],
  Portland: [45.5152, -122.6784],
  Prague: [50.0755, 14.4378],
  'San Jose': [37.3382, -121.8863],
  Seattle: [47.6062, -122.3321],
  Stockholm: [59.3293, 18.0686],
  Sydney: [-33.8688, 151.2093],
  Toronto: [43.6532, -79.3832],
  Vancouver: [49.2827, -123.1207],
  Vienna: [48.2082, 16.3738],
  Warsaw: [52.2297, 21.0122],
};

function currentYear() {
  return new Date().getUTCFullYear();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
  if (value === undefined || value === null) return value;
  return String(value).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const named = {
      amp: '&',
      apos: "'",
      aring: '\u00e5',
      auml: '\u00e4',
      aacute: '\u00e1',
      agrave: '\u00e0',
      acirc: '\u00e2',
      atilde: '\u00e3',
      ccedil: '\u00e7',
      copy: '(c)',
      eacute: '\u00e9',
      egrave: '\u00e8',
      ecirc: '\u00ea',
      euml: '\u00eb',
      eth: '\u00f0',
      gt: '>',
      iacute: '\u00ed',
      igrave: '\u00ec',
      icirc: '\u00ee',
      iuml: '\u00ef',
      lt: '<',
      ntilde: '\u00f1',
      nbsp: ' ',
      oacute: '\u00f3',
      ograve: '\u00f2',
      ocirc: '\u00f4',
      oslash: '\u00f8',
      otilde: '\u00f5',
      ouml: '\u00f6',
      quot: '"',
      reg: '(R)',
      szlig: '\u00df',
      thorn: '\u00fe',
      uacute: '\u00fa',
      ugrave: '\u00f9',
      ucirc: '\u00fb',
      uuml: '\u00fc',
      yacute: '\u00fd',
      yuml: '\u00ff',
    };
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      return String.fromCodePoint(parseInt(lower.slice(2), 16));
    }
    if (lower.startsWith('#')) {
      return String.fromCodePoint(parseInt(lower.slice(1), 10));
    }
    if (named[lower]) return named[lower];
    return match;
  });
}

function deepDecode(value) {
  if (Array.isArray(value)) return value.map(deepDecode);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, deepDecode(nested)]));
  }
  return typeof value === 'string' ? compact(decodeHtmlEntities(value)) : value;
}

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function slugify(value) {
  return compact(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function seriesNameFromEventName(name) {
  return compact(name)
    .replace(/\s*\(?\d{4}\)?\s*$/u, '')
    .replace(/\s+-\s+\d{4}\s*$/u, '')
    .trim() || compact(name);
}

function eventIdFromUrl(url) {
  const match = String(url || '').match(/\/event\/(\d+)\//);
  return match?.[1] || null;
}

function normalizeFurryConsUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, appConfig.furryConsCom.baseUrl || 'https://furrycons.com');
    parsed.protocol = 'https:';
    return parsed.toString();
  } catch (error) {
    return null;
  }
}

function extractJsonLdScripts(html) {
  const scripts = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    scripts.push(match[1].trim());
  }
  return scripts;
}

function parseEventsFromHtml(html) {
  return extractJsonLdScripts(html).flatMap(script => {
    try {
      const parsed = JSON.parse(script);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.filter(item => item?.['@type'] === 'Event').map(deepDecode);
    } catch (error) {
      return [];
    }
  });
}

function stripTags(value = '') {
  return compact(decodeHtmlEntities(String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')));
}

function extractTableBody(html) {
  const tableMatch = html.match(/<table[^>]+id=["']ConListTable["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return '';
  const bodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  return bodyMatch?.[1] || tableMatch[1];
}

function extractCells(rowHtml) {
  const cells = [];
  const regex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = regex.exec(rowHtml))) {
    cells.push(match[1]);
  }
  return cells;
}

function isoDate(year, monthName, day) {
  const monthIndex = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  }[String(monthName || '').toLowerCase()];

  if (!monthIndex) return null;
  return `${year}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthNumber(monthName) {
  const date = isoDate(2000, monthName, 1);
  return date ? Number(date.slice(5, 7)) : null;
}

function parseTableDateRange(value, pageYear) {
  const text = stripTags(value)
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

  let match = text.match(/^([A-Za-z]+) (\d{1,2}), (\d{4}) - ([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (match) {
    return {
      startDate: isoDate(Number(match[3]), match[1], match[2]),
      endDate: isoDate(Number(match[6]), match[4], match[5]),
    };
  }

  match = text.match(/^([A-Za-z]+) (\d{1,2}) - ([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (match) {
    const endYear = Number(match[5]);
    const startMonth = monthNumber(match[1]);
    const endMonth = monthNumber(match[3]);
    const startYear = startMonth && endMonth && startMonth > endMonth ? endYear - 1 : endYear;
    return {
      startDate: isoDate(startYear, match[1], match[2]),
      endDate: isoDate(endYear, match[3], match[4]),
    };
  }

  match = text.match(/^([A-Za-z]+) (\d{1,2}) - (\d{1,2}), (\d{4})$/);
  if (match) {
    return {
      startDate: isoDate(Number(match[4]), match[1], match[2]),
      endDate: isoDate(Number(match[4]), match[1], match[3]),
    };
  }

  match = text.match(/^([A-Za-z]+) (\d{1,2}) - (\d{1,2})$/);
  if (match) {
    return {
      startDate: isoDate(pageYear, match[1], match[2]),
      endDate: isoDate(pageYear, match[1], match[3]),
    };
  }

  match = text.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (match) {
    const date = isoDate(Number(match[3]), match[1], match[2]);
    return { startDate: date, endDate: date };
  }

  return { startDate: null, endDate: null };
}

function parseTableLocation(value) {
  const lines = String(value || '')
    .split(/<br\s*\/?>/i)
    .map(stripTags)
    .filter(Boolean);
  const venue = lines[0] || null;
  const locationText = lines.slice(1).join(', ');
  const parts = locationText.split(',').map(compact).filter(Boolean);
  const city = parts[0] || null;
  let region = parts.length > 2 ? parts[parts.length - 2] : parts[1] || null;
  let country = parts.length > 2 ? parts[parts.length - 1] : null;

  if (!country && region && US_STATE_COORDINATES[region]) {
    country = 'USA';
  }

  if (!country && region && CANADA_REGION_COORDINATES[region]) {
    country = 'Canada';
  }

  if (!country && region && COUNTRY_COORDINATES[region]) {
    country = region;
    region = null;
  }

  return { venue, city, region, country };
}

function parseTableEventsFromHtml(html, year) {
  const body = extractTableBody(html);
  if (!body) return [];

  const events = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(body))) {
    const cells = extractCells(rowMatch[1]);
    if (cells.length < 3) continue;

    const linkMatch = cells[0].match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i);
    const name = stripTags(cells[0].replace(/\bCancelled\b/gi, ''));
    const sourceUrl = normalizeFurryConsUrl(linkMatch?.[1]);
    const dates = parseTableDateRange(cells[1], year);
    const location = parseTableLocation(cells[2]);
    const isCancelled = /label-danger|Cancelled/i.test(cells[0]);

    events.push({
      '@type': 'Event',
      name,
      startDate: dates.startDate,
      endDate: dates.endDate,
      url: sourceUrl,
      eventStatus: isCancelled ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: location.venue,
        address: {
          '@type': 'PostalAddress',
          addressLocality: location.city,
          addressRegion: location.region,
          addressCountry: location.country,
        },
      },
    });
  }

  return events;
}

function parseCalendarEvents(html, year) {
  const tableEvents = parseTableEventsFromHtml(html, year);
  const jsonEvents = parseEventsFromHtml(html);
  return tableEvents.length > jsonEvents.length ? tableEvents : jsonEvents;
}

function calendarUrl(year) {
  const baseUrl = String(appConfig.furryConsCom.baseUrl || 'https://furrycons.com').replace(/\/+$/, '');
  const path = appConfig.furryConsCom.calendarPath || '/calendar/calendar.php';
  const url = new URL(path, baseUrl);
  url.searchParams.set('year', String(year));
  return url.toString();
}

async function fetchYearEvents(year) {
  const url = calendarUrl(year);
  const response = await axios.get(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'PawPortBot/0.1 (+https://pawport.me)',
    },
    timeout: 30000,
  });

  return { events: parseCalendarEvents(response.data, year), url };
}

function coordinateForLocation({ city, region, country }) {
  const cleanCity = compact(city).split(',')[0];
  const cleanRegion = compact(region);
  const cleanCountry = compact(country);

  if (CITY_COORDINATES[cleanCity]) {
    const [latitude, longitude] = CITY_COORDINATES[cleanCity];
    return { latitude, longitude, precision: 'city' };
  }

  if (cleanCountry === 'USA' && US_STATE_COORDINATES[cleanRegion]) {
    const [latitude, longitude] = US_STATE_COORDINATES[cleanRegion];
    return { latitude, longitude, precision: 'region' };
  }

  if (cleanCountry === 'Canada' && CANADA_REGION_COORDINATES[cleanRegion]) {
    const [latitude, longitude] = CANADA_REGION_COORDINATES[cleanRegion];
    return { latitude, longitude, precision: 'region' };
  }

  if (COUNTRY_COORDINATES[cleanCountry]) {
    const [latitude, longitude] = COUNTRY_COORDINATES[cleanCountry];
    return { latitude, longitude, precision: 'country' };
  }

  return { latitude: null, longitude: null, precision: 'unknown' };
}

function buildAddress(venue, city, region, country) {
  const place = [city, region, country].map(compact).filter(Boolean).join(', ');
  return [venue, place].map(compact).filter(Boolean).join(', ') || null;
}

function mapEventToConData(event) {
  const sourceUrl = normalizeFurryConsUrl(event.url);
  const sourceId = eventIdFromUrl(sourceUrl);
  const address = event.location?.address || {};
  const country = firstValue(address.addressCountry, event.location?.addressCountry);
  const region = firstValue(address.addressRegion, event.location?.addressRegion);
  const city = firstValue(address.addressLocality, event.location?.addressLocality);
  const venue = firstValue(event.location?.name, event.locationName);
  const seriesName = seriesNameFromEventName(event.name);
  const coords = coordinateForLocation({ city, region, country });

  return {
    name: event.name,
    name_en: event.name,
    name_local: event.name,
    series_key: `furrycons-com-${slugify(seriesName)}`.slice(0, 120),
    series_name: seriesName,
    edition_label: event.name,
    start_date: event.startDate,
    end_date: event.endDate || event.startDate,
    venue,
    city,
    country,
    address: buildAddress(venue, city, region, country),
    latitude: coords.latitude,
    longitude: coords.longitude,
    poster_url: normalizeFurryConsUrl(event.image),
    avatar_url: normalizeFurryConsUrl(event.image),
    theme: null,
    theme_color: DEFAULT_THEME_COLOR,
    website: sourceUrl,
    description: event.description,
    fcc_id: sourceId ? `${SOURCE_PREFIX}${sourceId}` : null,
    fcc_slug: sourceUrl ? sourceUrl.split('/').filter(Boolean).pop() : null,
    status: 'approved',
    is_test: false,
    extra_fields: {
      source: SOURCE,
      sourceId,
      sourceUrl,
      furryConsComSyncedAt: new Date().toISOString(),
      locationPrecision: coords.precision,
      eventStatus: event.eventStatus || null,
      attendanceMode: event.eventAttendanceMode || null,
      rawLocation: event.location || null,
    },
  };
}

async function upsertCon(conData) {
  const [con, wasCreated] = await Con.findOrCreate({
    where: { fcc_id: conData.fcc_id },
    defaults: conData,
  });

  if (wasCreated) return 'created';

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
    theme_color: conData.theme_color || con.theme_color,
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

function syncYearRange(options = {}) {
  const config = appConfig.furryConsCom || {};
  const fromYear = Number(options.fromYear || config.startYear || 1989);
  const configuredToYear = options.toYear || config.endYear;
  const toYear = Number(configuredToYear || currentYear() + Number(config.futureYears ?? 1));
  return { fromYear, toYear };
}

async function syncFurryConsCom(options = {}) {
  if (!appConfig.features.enableFurryConsComSync) {
    console.log('⏭️ FurryCons.com sync is disabled');
    return { skipped: true, reason: 'feature-disabled' };
  }

  const { fromYear, toYear } = syncYearRange(options);
  const delayMs = Number(appConfig.furryConsCom?.requestDelayMs || 0);
  const stats = {
    years: 0,
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(`🔄 Starting FurryCons.com calendar sync (${fromYear}-${toYear})...`);

  for (let year = fromYear; year <= toYear; year++) {
    try {
      const { events } = await fetchYearEvents(year);
      stats.years++;
      stats.fetched += events.length;
      console.log(`  📥 ${year}: fetched ${events.length} events from FurryCons.com`);

      for (const event of events) {
        try {
          const conData = mapEventToConData(event);
          if (!conData.fcc_id || !conData.name || !conData.start_date || !conData.end_date) {
            stats.skipped++;
            continue;
          }

          const result = await upsertCon(conData);
          stats[result]++;
        } catch (eventError) {
          stats.failed++;
          console.error(`  ⚠️ Error processing FurryCons.com event ${event.url || event.name}:`, eventError.message);
        }
      }
    } catch (yearError) {
      stats.failed++;
      console.error(`  ⚠️ FurryCons.com ${year} fetch failed:`, yearError.message);
    }

    if (delayMs && year < toYear) {
      await sleep(delayMs);
    }
  }

  console.log(`  ✅ FurryCons.com sync complete: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed`);
  return stats;
}

function cliOptions(argv) {
  const year = argv.find(arg => arg.startsWith('--year='))?.split('=')[1];
  if (year) return { fromYear: Number(year), toYear: Number(year) };

  const fromYear = argv.find(arg => arg.startsWith('--from='))?.split('=')[1];
  const toYear = argv.find(arg => arg.startsWith('--to='))?.split('=')[1];
  return {
    ...(fromYear ? { fromYear: Number(fromYear) } : {}),
    ...(toYear ? { toYear: Number(toYear) } : {}),
  };
}

if (require.main === module) {
  syncFurryConsCom(cliOptions(process.argv.slice(2))).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = {
  syncFurryConsCom,
  parseEventsFromHtml,
  mapEventToConData,
};
