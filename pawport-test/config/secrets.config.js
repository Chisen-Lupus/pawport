module.exports = {
  // 数据库配置
  database: {
    dialect: process.env.DB_DIALECT || (process.env.NODE_ENV === 'production' ? 'mysql' : 'sqlite'),
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'pawport',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'pawport_dev_123',
    storage: process.env.DB_STORAGE || './data/pawport.sqlite',
  },
  
  // JWT密钥
  jwt: {
    secret: process.env.JWT_SECRET || 'pawport-dev-secret-key-change-in-production',
    expiresIn: '7d',
  },
  
  // FCC API Token
  fcc: {
    token: process.env.FCC_TOKEN || '',
  },
  
  // OAuth配置（未来启用）
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    wechat: {
      appId: process.env.WECHAT_APP_ID || '',
      appSecret: process.env.WECHAT_APP_SECRET || '',
    },
    qq: {
      appId: process.env.QQ_APP_ID || '',
      appKey: process.env.QQ_APP_KEY || '',
    },
  },
  
  // 短信服务配置
  sms: {
    provider: 'aliyun',
    accessKeyId: process.env.SMS_KEY_ID || '',
    accessKeySecret: process.env.SMS_KEY_SECRET || '',
  },
  
  // Session密钥
  session: {
    secret: process.env.SESSION_SECRET || 'pawport-session-secret',
  }
};
