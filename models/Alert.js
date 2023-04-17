const Alert = (sequelize, DataTypes) => {
  const Alert = sequelize.define(
    "Alert",
    {
      title: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      isChecked: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "unpub",
        comment: "unpub / false / true",
      },
      publishDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
      tableName: "Alert",
      timestamps: false,
    }
  );

  Alert.associate = (models) => {
    models.Alert.belongsTo(models.User, {
      foreignKey: "userId",
      sourceKey: "id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  };

  return Alert;
};

export default Alert;
