import renewalData from "../utils/renewal/renewalData.js";
import models from "../models/index.js";

const Course = models.Course;
const Wishlist = models.Wishlist;
const courseController = {};

// 강좌 목록 조회
courseController.readList = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    // 데이터 갱신
    const { updateResult, newLength } = await renewalData();

    const type = req.params.type; // all / off / on
    const order = req.params.order; // insert / like / end
    const types = ["all", "off", "on"];
    const orders = ["insert", "like", "end"];
    let isValidType = false;
    let isValidOrder = false;
    let data = null;
    const courseList = [];

    // params 값 유효성 검사
    types.map((item) => {
      if (item === type) {
        isValidType = true;
      }
    });
    orders.map((item) => {
      if (item === order) {
        isValidOrder = true;
      }
    });

    if (!isValidType) {
      throw new Error("Invalid type.");
    }
    if (!isValidType) {
      throw new Error("Invalid order.");
    }

    // 모든 강좌 데이터 리스트 조회
    if (type === "all") {
      switch (order) {
        case "insert":
          data = await Course.findAll({
            attributes: [
              "type",
              "id",
              "title",
              "applyStartDate",
              "applyEndDate",
              "isFree",
              "category",
            ],
            order: [["insertDate", "DESC"]],
          }).then((res) => {
            return res;
          });
          break;
        case "like":
          data = await Course.findAll({
            attributes: [
              "type",
              "id",
              "title",
              "applyStartDate",
              "applyEndDate",
              "isFree",
              "category",
            ],
            order: [
              ["likeCount", "DESC"],
              ["insertDate", "DESC"],
            ],
          }).then((res) => {
            return res;
          });
          break;
        case "end":
          data = await Course.findAll({
            attributes: [
              "type",
              "id",
              "title",
              "applyStartDate",
              "applyEndDate",
              "isFree",
              "category",
            ],
            order: [["applyEndDate", "ASC"]],
          }).then((res) => {
            return res;
          });
          break;
      }
    } else {
      // off / on 개별 조회
      switch (order) {
        case "insert":
          data = await Course.findAll({
            attributes: [
              "id",
              "title",
              "applyStartDate",
              "applyEndDate",
              "isFree",
              "category",
            ],
            where: {
              type: type,
            },
            order: [["insertDate", "DESC"]],
          }).then((res) => {
            return res;
          });
          break;
        case "like":
          data = await Course.findAll({
            attributes: [
              "id",
              "title",
              "applyStartDate",
              "applyEndDate",
              "isFree",
              "category",
            ],
            where: {
              type: type,
            },
            order: [
              ["likeCount", "DESC"],
              ["insertDate", "DESC"],
            ],
          }).then((res) => {
            return res;
          });
          break;
        case "end":
          data = await Course.findAll({
            attributes: [
              "id",
              "title",
              "applyStartDate",
              "applyEndDate",
              "isFree",
              "category",
            ],
            where: {
              type: type,
            },
            order: [["applyEndDate", "ASC"]],
          }).then((res) => {
            return res;
          });
          break;
      }
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

// 강좌 세부 조회
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

// 찜 추가 및 삭제
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

      // 강좌 관심 설정 수 증가
      await Course.increment({ likeCount: 1 }, { where: { id: courseId } });
    } else {
      // 찜 해제
      await Wishlist.destroy({
        where: {
          userId: userId,
          courseId: courseId,
        },
      });

      // 강좌 관심 설정 수 감소
      await Course.increment({ likeCount: -1 }, { where: { id: courseId } });
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
