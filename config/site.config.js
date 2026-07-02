module.exports = {
  app: {
    domain: 'pawport.me',
    ip: '45.32.59.92',
    localHost: 'localhost',
    localPort: 3001,
    frontendPort: 5173,
    publicRoot: '/www/wwwroot/pawport.me',
  },
  features: {
    showTestUsers: true,
    showTestCons: true,
    enableFCCSync: true,
    enableAnimations: true,
    enableTrajectories: true,
    enableOAuth: false,
    enableSmsLogin: false,
  },
  map: {
    tileServer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    lightTileServer: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    lightLabelServer: 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    darkTileServer: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    darkLabelServer: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    defaultCenter: [35, 105],
    defaultZoom: 4,
  },
  theme: {
    defaultPrimaryColor: '#6C63FF',
    defaultDarkMode: false,
  },
  // [扩展性] 预留未来功能入口，后续可按需打开。
  extensions: {
    enableActiveUsers: false,
    enableFurryMeets: false,
    enableSocialFeatures: false,
    enableHotelCoordination: false,
  },
  fcc: {
    baseUrl: 'https://api.furrycons.cn/open',
    calendarPath: '/event/recent',
    detailPath: '/event',
    keepOld: true,
    fetchDetails: true,
    syncInterval: 24 * 60 * 60 * 1000,
  },
};
