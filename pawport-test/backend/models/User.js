const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true, // OAuth users might not have password
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    theme_color: {
      type: DataTypes.STRING(7), // #RRGGBB
      defaultValue: '#6C63FF',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // OAuth链接
    google_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    wechat_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    qq_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    // 隐私设置
    show_on_homepage: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    show_con_history: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    show_hotel_info: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // 标记是否为测试用户
    is_test: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // 角色
    role: {
      type: DataTypes.ENUM('user', 'moderator', 'admin'),
      defaultValue: 'user',
    },
    // 扩展字段 - JSON格式，方便未来添加
    extra_fields: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['phone'] },
      { fields: ['is_test'] },
    ],
  });

  return User;
};
