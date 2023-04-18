const Post = (sequelize, DataTypes) => {
  const Post = sequelize.define(
    "Post",
    {
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      publishDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      wishCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
      tableName: "Post",
      timestamps: false,
    }
  );

  Post.associate = (models) => {
    models.Post.belongsTo(models.User, {
      foreignKey: "userId",
      sourceKey: "id",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
    models.Post.hasMany(models.Comment, {
      foreignKey: "postId",
      onDelete: "cascade",
      onUpdate: "cascade",
    });
  };

  return Post;
};

export default Post;