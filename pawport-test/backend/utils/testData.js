function parseBooleanish(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

function getTestDataPreference(req = {}) {
  return parseBooleanish(
    req.headers?.['x-pawport-test-data']
      ?? req.query?.test_data
      ?? req.query?.show_test_data,
  )
}

function shouldIncludeTestData(req, defaultEnabled = true) {
  if (!defaultEnabled) return false

  const preference = getTestDataPreference(req)
  if (preference === false) return false
  return true
}

module.exports = {
  getTestDataPreference,
  parseBooleanish,
  shouldIncludeTestData,
}
