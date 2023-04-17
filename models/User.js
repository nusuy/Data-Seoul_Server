const User = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      nickname: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      joinDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      isSocial: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      isAuthorized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      password: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
      tableName: "User",
      timestamps: false,
    }
  );

  User.associate = (models) => {
    models.User.hasMany(models.Post, {
      foreignKey: "userId",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
    models.User.hasMany(models.Wishlist, {
      foreignKey: "userId",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
    models.User.hasMany(models.Comment, {
      foreignKey: "userId",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
    models.User.hasMany(models.ReplyToComment, {
      foreignKey: "userId",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
    models.User.hasMany(models.Alert, {
      foreignKey: "userId",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  };

  return User;
};

export default User;
