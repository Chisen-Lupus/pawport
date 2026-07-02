const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Con = sequelize.define('Con', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // 基本信息
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    name_en: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    name_local: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    series_key: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    series_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    edition_label: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // 日期
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // 地址
    venue: {
      type: DataTypes.STRING(300),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    // 可选信息
    poster_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    theme: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    theme_color: {
      type: DataTypes.STRING(7),
      defaultValue: '#6C63FF',
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // FCC同步相关
    fcc_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    fcc_slug: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    // 状态
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'approved',
    },
    // 提交者
    submitted_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // 测试数据标记
    is_test: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // 扩展字段
    extra_fields: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  }, {
    tableName: 'cons',
    indexes: [
      { fields: ['start_date'] },
      { fields: ['end_date'] },
      { fields: ['city'] },
      { fields: ['country'] },
      { fields: ['fcc_id'] },
      { fields: ['series_key'] },
      { fields: ['is_test'] },
      { fields: ['status'] },
    ],
  });

  return Con;
};
