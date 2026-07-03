const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

require('../utils/loadEnv')();

const secretsConfig = require('../../config/secrets.config');

const backendDir = path.resolve(__dirname, '..');
const dbConfig = secretsConfig.database;

const MODEL_ORDER = [
  ['User', 'users'],
  ['Con', 'cons'],
  ['Hotel', 'hotels'],
  ['UserCon', 'user_cons'],
  ['UserConHotel', 'user_con_hotels'],
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[key] = argv[i + 1];
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function option(args, key, envKeys, fallback = undefined) {
  if (args[key] !== undefined) return args[key];
  for (const envKey of envKeys) {
    if (process.env[envKey] !== undefined) return process.env[envKey];
  }
  return fallback;
}

function resolveSqlitePath(storage) {
  if (!storage) return path.resolve(backendDir, 'data', 'pawport.sqlite');
  return path.isAbsolute(storage) ? storage : path.resolve(backendDir, storage);
}

function mysqlConfigFrom(args) {
  return {
    host: option(args, 'mysqlHost', ['MYSQL_HOST', 'DB_HOST'], dbConfig.host || 'localhost'),
    port: Number(option(args, 'mysqlPort', ['MYSQL_PORT', 'DB_PORT'], dbConfig.port || 3306)),
    database: option(args, 'mysqlDb', ['MYSQL_DB', 'MYSQL_DATABASE', 'DB_NAME'], dbConfig.name || 'pawport'),
    username: option(args, 'mysqlUser', ['MYSQL_USER', 'DB_USER'], dbConfig.username || 'root'),
    password: option(args, 'mysqlPass', ['MYSQL_PASS', 'MYSQL_PASSWORD', 'DB_PASS'], dbConfig.password || ''),
  };
}

function commonSequelizeOptions(dialect, extra = {}) {
  return {
    dialect,
    logging: process.env.DEBUG_SQL === 'true' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    ...extra,
  };
}

function attachAssociations(models) {
  const { User, Con, Hotel, UserCon, UserConHotel } = models;

  User.belongsToMany(Con, { through: UserCon, foreignKey: 'user_id', otherKey: 'con_id' });
  Con.belongsToMany(User, { through: UserCon, foreignKey: 'con_id', otherKey: 'user_id' });

  User.hasMany(UserCon, { foreignKey: 'user_id' });
  UserCon.belongsTo(User, { foreignKey: 'user_id' });

  Con.hasMany(UserCon, { foreignKey: 'con_id' });
  UserCon.belongsTo(Con, { foreignKey: 'con_id' });

  UserCon.belongsToMany(Hotel, { through: UserConHotel, foreignKey: 'user_con_id', otherKey: 'hotel_id' });
  Hotel.belongsToMany(UserCon, { through: UserConHotel, foreignKey: 'hotel_id', otherKey: 'user_con_id' });
}

function loadModels(sequelize) {
  const models = {
    User: require('../models/User')(sequelize),
    Con: require('../models/Con')(sequelize),
    Hotel: require('../models/Hotel')(sequelize),
    UserCon: require('../models/UserCon')(sequelize),
    UserConHotel: require('../models/UserConHotel')(sequelize),
  };
  attachAssociations(models);
  return models;
}

function createSqliteConnection(storagePath) {
  return new Sequelize({
    ...commonSequelizeOptions('sqlite'),
    storage: storagePath,
  });
}

function createMysqlConnection(config) {
  return new Sequelize(config.database, config.username, config.password, {
    ...commonSequelizeOptions('mysql', {
      host: config.host,
      port: config.port,
      dialectOptions: {
        charset: 'utf8mb4',
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }),
  });
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

async function createDatabaseIfNeeded(config) {
  const bootstrap = new Sequelize('mysql', config.username, config.password, {
    ...commonSequelizeOptions('mysql', {
      host: config.host,
      port: config.port,
    }),
  });

  try {
    await bootstrap.authenticate();
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await bootstrap.close();
  }
}

function getAttributes(model) {
  return typeof model.getAttributes === 'function' ? model.getAttributes() : model.rawAttributes;
}

function primaryOrder(model) {
  const primaryKey = Object.entries(getAttributes(model)).find(([, attr]) => attr.primaryKey)?.[0];
  return primaryKey ? [[primaryKey, 'ASC']] : [];
}

function jsonAttributeNames(model) {
  return Object.entries(getAttributes(model))
    .filter(([, attr]) => attr.type?.key === 'JSON')
    .map(([name]) => name);
}

function normalizeJson(value) {
  if (value === null || value === undefined || typeof value !== 'string') return value;
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function normalizeRows(model, rows) {
  const jsonAttrs = jsonAttributeNames(model);
  if (!jsonAttrs.length) return rows;

  return rows.map(row => {
    const normalized = { ...row };
    jsonAttrs.forEach(attr => {
      normalized[attr] = normalizeJson(normalized[attr]);
    });
    return normalized;
  });
}

function duplicateUpdateFields(model) {
  return Object.entries(getAttributes(model))
    .filter(([, attr]) => !attr.primaryKey && !attr._autoGenerated)
    .map(([name]) => name);
}

async function countModels(models) {
  const counts = {};
  for (const [key, tableName] of MODEL_ORDER) {
    counts[tableName] = await models[key].count();
  }
  return counts;
}

function totalRows(counts) {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function printCounts(label, counts) {
  console.log(label);
  for (const [, tableName] of MODEL_ORDER) {
    console.log(`  ${tableName}: ${counts[tableName] || 0}`);
  }
}

async function copyModel({ sourceModel, targetModel, tableName, batchSize, merge, transaction }) {
  const total = await sourceModel.count();
  const updateOnDuplicate = merge ? duplicateUpdateFields(targetModel) : null;
  let copied = 0;

  for (let offset = 0; offset < total; offset += batchSize) {
    const rows = await sourceModel.findAll({
      raw: true,
      order: primaryOrder(sourceModel),
      limit: batchSize,
      offset,
    });

    const normalizedRows = normalizeRows(sourceModel, rows);
    if (normalizedRows.length) {
      const bulkOptions = {
        transaction,
        validate: false,
      };
      if (updateOnDuplicate?.length) {
        bulkOptions.updateOnDuplicate = updateOnDuplicate;
      }
      await targetModel.bulkCreate(normalizedRows, bulkOptions);
    }

    copied += normalizedRows.length;
    console.log(`  ${tableName}: ${copied}/${total}`);
  }

  if (total === 0) {
    console.log(`  ${tableName}: 0/0`);
  }
}

async function migrateData(sourceModels, targetModels, options) {
  const transaction = await targetModels.User.sequelize.transaction();
  try {
    for (const [key, tableName] of MODEL_ORDER) {
      await copyModel({
        sourceModel: sourceModels[key],
        targetModel: targetModels[key],
        tableName,
        batchSize: options.batchSize,
        merge: options.merge,
        transaction,
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

function printUsage() {
  console.log(`
Usage:
  npm run db:migrate:sqlite-to-mysql -- [options]

Options:
  --sqlite <path>          Source SQLite file. Defaults to SQLITE_STORAGE, DB_STORAGE, then ./data/pawport.sqlite.
  --mysql-host <host>      MySQL host. Defaults to MYSQL_HOST or DB_HOST.
  --mysql-port <port>      MySQL port. Defaults to MYSQL_PORT or DB_PORT.
  --mysql-db <name>        MySQL database. Defaults to MYSQL_DB, MYSQL_DATABASE, or DB_NAME.
  --mysql-user <user>      MySQL user. Defaults to MYSQL_USER or DB_USER.
  --mysql-pass <pass>      MySQL password. Defaults to MYSQL_PASS, MYSQL_PASSWORD, or DB_PASS.
  --create-database        Create the MySQL database if the account has permission.
  --alter-target           Run Sequelize sync({ alter: true }) before copying.
  --force-target           Drop and recreate target tables before copying. Destructive.
  --merge                  Allow copying into a non-empty target using bulk upsert.
  --batch-size <number>    Rows per insert batch. Defaults to 500.
  --dry-run                Read the SQLite source and print counts without connecting to MySQL.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const sqlitePath = resolveSqlitePath(option(args, 'sqlite', ['SQLITE_STORAGE', 'DB_STORAGE'], dbConfig.storage));
  const mysqlConfig = mysqlConfigFrom(args);
  const batchSize = Math.max(1, Number(option(args, 'batchSize', ['MIGRATION_BATCH_SIZE'], 500)) || 500);
  const dryRun = Boolean(args.dryRun);
  const forceTarget = Boolean(args.forceTarget || args.force);
  const alterTarget = Boolean(args.alterTarget);
  const merge = Boolean(args.merge);

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite source file does not exist: ${sqlitePath}`);
  }

  console.log('SQLite -> MySQL migration');
  console.log(`  SQLite: ${sqlitePath}`);
  console.log(`  MySQL: ${mysqlConfig.username}@${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);
  console.log(`  Batch size: ${batchSize}`);
  console.log(`  Mode: ${dryRun ? 'dry-run' : forceTarget ? 'force target' : merge ? 'merge' : 'empty target only'}`);

  const sourceSequelize = createSqliteConnection(sqlitePath);
  const sourceModels = loadModels(sourceSequelize);
  let targetSequelize = null;

  try {
    await sourceSequelize.authenticate();
    const sourceCounts = await countModels(sourceModels);
    printCounts('Source counts:', sourceCounts);

    if (dryRun) {
      console.log('Dry run complete. No MySQL connection was opened.');
      return;
    }

    if (args.createDatabase) {
      await createDatabaseIfNeeded(mysqlConfig);
    }

    targetSequelize = createMysqlConnection(mysqlConfig);
    const targetModels = loadModels(targetSequelize);

    await targetSequelize.authenticate();
    await targetSequelize.sync({
      force: forceTarget,
      alter: !forceTarget && alterTarget,
    });

    const targetCounts = await countModels(targetModels);
    printCounts('Target counts before migration:', targetCounts);

    if (!forceTarget && !merge && totalRows(targetCounts) > 0) {
      throw new Error(
        'Target MySQL tables are not empty. Re-run with --force-target to replace them or --merge to upsert into them.',
      );
    }

    await migrateData(sourceModels, targetModels, { batchSize, merge });

    const finalCounts = await countModels(targetModels);
    printCounts('Target counts after migration:', finalCounts);
    console.log('Migration complete.');
  } finally {
    if (targetSequelize) await targetSequelize.close();
    await sourceSequelize.close();
  }
}

main().catch(error => {
  console.error('Migration failed:', error.message);
  if (process.env.DEBUG_SQL === 'true') {
    console.error(error);
  }
  process.exit(1);
});
