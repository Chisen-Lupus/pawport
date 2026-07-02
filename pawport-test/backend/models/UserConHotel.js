const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserConHotel = sequelize.define('UserConHotel', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_con_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    hotel_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    check_in: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    check_out: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  }, {
    tableName: 'user_con_hotels',
    indexes: [
      { fields: ['user_con_id'] },
      { fields: ['hotel_id'] },
    ],
  });

  return UserConHotel;
};
