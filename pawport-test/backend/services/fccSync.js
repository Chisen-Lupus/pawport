const axios = require('axios');
const appConfig = require('../../config/app.config');
const secretsConfig = require('../../config/secrets.config');
const { Con } = require('../database/init');

const FCC_BASE_URL = appConfig.fcc.baseUrl;
const FCC_TOKEN = secretsConfig.fcc.token;

function buildSeriesKey(event) {
  const source = event.organization?.slug || event.organization?.name || event.name || event.slug || event.id;
  return String(source)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function syncFCC() {
  if (!appConfig.features.enableFCCSync) {
    console.log('⏭️ FCC sync is disabled');
    return;
  }

  if (!FCC_TOKEN) {
    console.log('⏭️ FCC sync skipped: FCC_TOKEN is not configured');
    return;
  }

  try {
    console.log('🔄 Starting FCC sync...');
    
    // Based on docs: https://docs.furrycons.cn/docs/api/event/list
    const response = await axios.get(FCC_BASE_URL, {
      headers: {
        'Authorization': `Bearer ${FCC_TOKEN}`,
      },
      params: {
        current: 1,
        pageSize: 200,
      },
      timeout: 30000,
    });

    if (!response.data || !response.data.data) {
      console.log('⚠️ FCC API returned empty data');
      return;
    }

    const events = Array.isArray(response.data.data)
      ? response.data.data
      : (response.data.data.list || []);
    console.log(`  📥 Fetched ${events.length} events from FCC`);

    let created = 0;
    let updated = 0;

    for (const event of events) {
      try {
        const conData = {
          name: event.name || event.title,
          name_en: event.nameEn || event.name_en || null,
          name_local: event.localName || event.nameLocal || null,
          series_key: buildSeriesKey(event),
          series_name: event.organization?.name || event.seriesName || event.name || null,
          edition_label: event.slug || null,
          start_date: event.startDate || event.start_date,
          end_date: event.endDate || event.end_date,
          venue: event.venue || event.address || event.region,
          city: event.city || event.region,
          country: event.country || '中国',
          address: event.address || event.fullAddress,
          latitude: event.latitude || event.lat,
          longitude: event.longitude || event.lng,
          poster_url: event.posterUrl || event.poster || event.cover || event.thumbnail,
          avatar_url: event.avatarUrl || event.logo || event.organization?.logoUrl,
          theme: event.theme || event.slogan,
          website: event.website || event.officialUrl || event.url,
          description: event.description || event.intro || event.detail,
          fcc_id: String(event.id),
          fcc_slug: event.slug || null,
          status: 'approved',
          is_test: false,
          extra_fields: {
            source: 'fcc',
            scale: event.scale,
            eventStatus: event.status,
            organization: event.organization || null,
            region: event.region || null,
          },
        };

        // Skip if missing required fields
        if (!conData.name || !conData.start_date || !conData.end_date) {
          continue;
        }

        const [con, wasCreated] = await Con.findOrCreate({
          where: { fcc_id: conData.fcc_id },
          defaults: conData,
        });

        if (wasCreated) {
          created++;
        } else {
          // Update existing con with new data (except user-modified fields)
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
            latitude: conData.latitude || con.latitude,
            longitude: conData.longitude || con.longitude,
            poster_url: conData.poster_url || con.poster_url,
            avatar_url: conData.avatar_url || con.avatar_url,
            website: conData.website || con.website,
            fcc_slug: conData.fcc_slug || con.fcc_slug,
            extra_fields: {
              ...(con.extra_fields || {}),
              ...(conData.extra_fields || {}),
            },
          });
          updated++;
        }
      } catch (eventError) {
        console.error(`  ⚠️ Error processing event ${event.id}:`, eventError.message);
      }
    }

    console.log(`  ✅ FCC sync complete: ${created} created, ${updated} updated`);
  } catch (error) {
    console.error('❌ FCC sync failed:', error.message);
    if (error.response) {
      console.error('  Response status:', error.response.status);
      console.error('  Response data:', JSON.stringify(error.response.data).substring(0, 200));
    }
  }
}

// Run directly
if (require.main === module) {
  syncFCC().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { syncFCC };
