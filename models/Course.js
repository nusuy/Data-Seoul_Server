const Course = (sequelize, DataTypes) => {
  const Course = sequelize.define(
    "Course",
    {
      type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: "offline / online",
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "offline / online",
      },
      deptName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      deptGu: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      deptLat: {
        type: DataTypes.DECIMAL(16, 14),
        allowNull: true,
      },
      deptLng: {
        type: DataTypes.DECIMAL(17, 14),
        allowNull: true,
      },
      isFree: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "online only",
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "offline only",
      },
    },
    {
      charset: "utf8",
      collate: "utf8_general_ci",
      tableName: "Course",
      timestamps: false,
    }
  );

  Course.associate = (models) => {
    models.Course.belongsTo(models.Dept, {
      foreignKey: {
        name: "deptId",
        allowNull: true,
      },
    });
    models.Course.hasMany(models.Wishlist, {
      foreignKey: "courseId",
    });
  };

  return Course;
};

export default Course;
