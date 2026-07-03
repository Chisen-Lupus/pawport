const siteConfig = require('../../config/site.config');

module.exports = {
  // 环境设置
  env: process.env.NODE_ENV || 'development',

  // 域名和IP配置
  domain: siteConfig.app.domain,
  ip: siteConfig.app.ip,

  // 本地开发配置
  local: {
    host: siteConfig.app.localHost,
    port: Number(process.env.PORT || siteConfig.app.localPort),
    frontendPort: siteConfig.app.frontendPort,
  },

  // 生产环境配置
  production: {
    port: Number(process.env.PORT || siteConfig.app.localPort),
    frontendPort: 80,
  },

  // 测试数据开关
  features: siteConfig.features,

  // FCC同步配置
  fcc: siteConfig.fcc,
  furryConsCom: siteConfig.furryConsCom,

  // 地图配置
  map: siteConfig.map,

  // 主题配置
  theme: siteConfig.theme,

  // 未来扩展预留
  extensions: siteConfig.extensions,
};
