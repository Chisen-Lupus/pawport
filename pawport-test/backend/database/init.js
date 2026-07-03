const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

require('../utils/loadEnv')();

const secretsConfig = require('../../config/secrets.config');
const appConfig = require('../../config/app.config');

const dbConfig = secretsConfig.database;

const commonOptions = {
  dialect: dbConfig.dialect,
  logging: process.env.DEBUG_SQL === 'true' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
};

let sequelize;

if (dbConfig.dialect === 'sqlite') {
  const storage = path.isAbsolute(dbConfig.storage)
    ? dbConfig.storage
    : path.resolve(__dirname, '..', dbConfig.storage);

  fs.mkdirSync(path.dirname(storage), { recursive: true });

  sequelize = new Sequelize({
    ...commonOptions,
    storage,
  });
} else {
  sequelize = new Sequelize(dbConfig.name, dbConfig.username, dbConfig.password, {
    ...commonOptions,
    host: dbConfig.host,
    port: dbConfig.port,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

// Import models
const User = require('../models/User')(sequelize);
const Con = require('../models/Con')(sequelize);
const Hotel = require('../models/Hotel')(sequelize);
const UserCon = require('../models/UserCon')(sequelize);
const UserConHotel = require('../models/UserConHotel')(sequelize);

// Define relationships
User.belongsToMany(Con, { through: UserCon, foreignKey: 'user_id', otherKey: 'con_id' });
Con.belongsToMany(User, { through: UserCon, foreignKey: 'con_id', otherKey: 'user_id' });

User.hasMany(UserCon, { foreignKey: 'user_id' });
UserCon.belongsTo(User, { foreignKey: 'user_id' });

Con.hasMany(UserCon, { foreignKey: 'con_id' });
UserCon.belongsTo(Con, { foreignKey: 'con_id' });

UserCon.belongsToMany(Hotel, { through: UserConHotel, foreignKey: 'user_con_id', otherKey: 'hotel_id' });
Hotel.belongsToMany(UserCon, { through: UserConHotel, foreignKey: 'hotel_id', otherKey: 'user_con_id' });

// Force sync if called directly with --force
if (require.main === module) {
  const force = process.argv.includes('--force');
  sequelize.sync({ force }).then(() => {
    console.log(`✅ Database ${force ? 'force ' : ''}synced`);
    process.exit(0);
  }).catch(err => {
    console.error('❌ Database sync failed:', err);
    process.exit(1);
  });
}

module.exports = { sequelize, User, Con, Hotel, UserCon, UserConHotel };
