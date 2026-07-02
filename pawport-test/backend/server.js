const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const appConfig = require('../config/app.config');
const secretsConfig = require('../config/secrets.config');
const { sequelize } = require('./database/init');
const { syncFCC } = require('./services/fccSync');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: appConfig.env === 'development' 
    ? [`http://localhost:${appConfig.local.frontendPort}`, 'http://localhost:5173']
    : [`https://${appConfig.domain}`, `http://${appConfig.ip}`],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/cons', require('./routes/cons'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/media', require('./routes/media'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    env: appConfig.env,
    features: appConfig.features,
    timestamp: new Date().toISOString()
  });
});

// Config endpoint (public, non-sensitive)
app.get('/api/config', (req, res) => {
  res.json({
    features: appConfig.features,
    map: appConfig.map,
    theme: appConfig.theme,
    extensions: appConfig.extensions,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: appConfig.env === 'development' ? err.message : 'Internal server error',
      ...(appConfig.env === 'development' && { stack: err.stack })
    }
  });
});

// Start server
const PORT = appConfig.env === 'development' ? appConfig.local.port : appConfig.production.port;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    await sequelize.sync(appConfig.env === 'development' ? {} : { alter: true });
    console.log('✅ Database synced');
    
    // Schedule FCC sync
    if (appConfig.features.enableFCCSync) {
      cron.schedule('0 3 * * *', () => {
        console.log('🔄 Running scheduled FCC sync...');
        syncFCC();
      });
      console.log('✅ FCC sync scheduled (daily at 3:00 AM)');

      setTimeout(() => {
        console.log('🔄 Running initial FCC sync...');
        syncFCC().catch(error => {
          console.error('⚠️ Initial FCC sync failed:', error.message);
        });
      }, 1000);
    }
    
    const host = appConfig.env === 'development' ? appConfig.local.host : '0.0.0.0';
    app.listen(PORT, host, () => {
      console.log(`🚀 PawPort API running on port ${PORT}`);
      console.log(`📍 Environment: ${appConfig.env}`);
      console.log(`🔧 Test data: ${appConfig.features.showTestUsers ? 'ON' : 'OFF'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
