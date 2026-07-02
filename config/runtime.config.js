module.exports = {
  environment: process.env.NODE_ENV || 'development',
  debug: true,
  testUsersEnabled: true,
  testConsEnabled: true,
  logLevel: 'debug',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  deployment: {
    domain: 'pawport.me',
    ip: '45.32.59.92',
  },
  notes: {
    localSetup: 'Use the backend and frontend dev servers for local work, then build for production deployment.',
    migration: 'Deploy the built frontend and backend to the target server via the provided panel or SSH.',
  },
};
