import renewalData from "../utils/renewal/renewalData.js";
import models from "../models/index.js";

const Course = models.Course;
const Wishlist = models.Wishlist;
const courseController = {};

courseController.readList = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    // 데이터 갱신
    const { updateResult, newLength } = await renewalData();

    const type = req.params.type; // all / off / on
    const types = ["all", "off", "on"];
    let isValid = false;
    let data = null;
    const courseList = [];

    types.map((item) => {
      if (item === type) {
        isValid = true;
      }
    });

    if (!isValid) {
      throw new Error("Invalid type.");
    }

    // 모든 강좌 데이터 리스트 조회
    if (type === "all") {
      data = await Course.findAll({
        attributes: ["type", "title", "deptName", "id"],
        order: [["applyStartDate", "DESC"]],
      }).then((res) => {
        return res;
      });
    } else {
      data = await Course.findAll({
        attributes: ["id", "title", "deptName"],
        where: {
          type: type,
        },
        order: [["applyStartDate", "DESC"]],
      }).then((res) => {
        return res;
      });
    }

    // 데이터 정제
    if (!data) {
      throw new Error("Database connection error.");
    }
    data.map((item) => {
      courseList.push(item["dataValues"]);
    });

    res.status(200).send({
      status: 200,
      message: `[Update Result] Offline: ${updateResult.off} - ${newLength.off}, Online: ${updateResult.on} - ${newLength.on}, Dept: ${updateResult.dept} - ${newLength.dept}`,
      data: courseList,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Invalid type.") {
      message = err.message;
      errCode = 400;
    } else if (err.message === "Database connection error.") {
      message = err.message;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

courseController.readDetail = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const courseId = req.params.courseId;

    // 데이터 조회
    const data = await Course.findOne({
      where: {
        id: courseId,
      },
    }).then((res) => {
      return res;
    });

    if (!data) {
      throw new Error("Invalid CourseId.");
    }

    res.status(200).send({
      status: 200,
      data: data["dataValues"],
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Invalid CourseId.") {
      message = err.message;
      errCode = 400;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

courseController.addLike = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const userId = req.user;
    const courseId = req.params.courseId;
    let isLiked = false;

    // 찜 여부 검사
    const data = await Wishlist.findOne({
      where: {
        userId: userId,
        courseId: courseId,
      },
    }).then((res) => {
      return res;
    });

    if (!data) {
      // 찜 등록
      await Wishlist.create({
        userId: userId,
        courseId: courseId,
      });
      isLiked = true;
    } else {
      // 찜 해제
      await Wishlist.destroy({
        where: {
          userId: userId,
          courseId: courseId,
        },
      });
    }

    res.status(200).send({
      status: 200,
      message: "Successfully Updated.",
      result: isLiked,
    });
  } catch (err) {
    console.error(err);

    if (err.name === "SequelizeDatabaseError") {
      message = "Invalid CourseId.";
      errCode = 400;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

export default courseController;
