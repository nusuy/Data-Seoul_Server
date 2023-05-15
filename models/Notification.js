const Notification = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
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
        comment: "new / last / comment / reply",
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
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      sourceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "courseId / commentId / replyId",
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
      tableName: "Notification",
      timestamps: false,
    }
  );

  Notification.associate = (models) => {
    models.Notification.belongsTo(models.User, {
      foreignKey: "userId",
      sourceKey: "id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  };

  return Notification;
};

export default Notification;
