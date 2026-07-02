const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserCon = sequelize.define('UserCon', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    con_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // 寄语/评价
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 5 },
    },
    // 参展顺序（用于轨迹显示）
    visit_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // 扩展字段 - 方便未来自由增加
    extra_fields: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  }, {
    tableName: 'user_cons',
    indexes: [
      { unique: true, fields: ['user_id', 'con_id'] },
      { fields: ['user_id'] },
      { fields: ['con_id'] },
      { fields: ['visit_order'] },
    ],
  });

  return UserCon;
};
