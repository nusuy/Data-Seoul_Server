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
    const type = req.params.type; // all / off / on
    const order = req.params.order; // insert / like / end
    const filter = req.query.filter;
    const types = ["all", "off", "on"];
    const orders = ["new", "like", "end"];
    const filters = ["upcoming", "ongoing", "done"];
    let orderOption = null;
    let isValidType = false;
    let isValidOrder = false;
    let isValidFilter = false;
    let data = null;
    const courseList = [];
    const filteredCourseList = [];

    // 데이터 갱신
    const { updateResult, newLength } = await renewalData();

    // type 옵션 값 유효성 검사
    types.map((item) => {
      if (item === type) {
        isValidType = true;
      }
    });

    // type 값이 올바르지 않은 경우
    if (!isValidType) {
      throw new Error("Invalid type.");
    }

    // order 옵션 값 유효성 검사
    orders.map((item) => {
      if (item === order) {
        isValidOrder = true;
      }
    });

    // order 값이 올바르지 않은 경우
    if (!isValidOrder) {
      throw new Error("Invalid order.");
    }

    // order option
    switch (order) {
      case "new":
        orderOption = [
          ["insertDate", "DESC"],
          ["id", "DESC"],
        ];
        break;
      case "like":
        orderOption = [
          ["likeCount", "DESC"],
          ["insertDate", "DESC"],
        ];
        break;
      case "end":
        orderOption = [["applyEndDate", "ASC"]];
        break;
    }

    // 강좌 데이터 리스트 조회
    if (type === "all") {
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
        order: orderOption,
      }).then((res) => {
        return res;
      });
    } else {
      // off / on 개별 조회
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
        where: {
          type: type,
        },
        order: orderOption,
      }).then((res) => {
        return res;
      });
    }

    if (!data) {
      throw new Error("Database connection error.");
    }
    data.map((item) => {
      courseList.push(item["dataValues"]);
    });

    // filter
    if (filter) {
      // filter 옵션 값 유효성 검사
      filters.map((item) => {
        if (item === filter) {
          isValidFilter = true;
        }
      });

      if (!isValidFilter) {
        throw new Error("Invalid filter.");
      }

      const now = new Date();
      now.setHours(9);
      now.setMinutes(0);
      now.setSeconds(0);

      switch (filter) {
        case "upcoming":
          courseList.map((item) => {
            if (new Date(item["applyStartDate"]) > now) {
              filteredCourseList.push(item);
            }
          });
          break;
        case "ongoing":
          courseList.map((item) => {
            if (
              new Date(item["applyStartDate"]) <= now &&
              new Date(item["applyEndDate"]) >= now
            ) {
              filteredCourseList.push(item);
            }
          });
          break;
        case "done":
          courseList.map((item) => {
            if (new Date(item["applyEndDate"]) < now) {
              filteredCourseList.push(item);
            }
          });
          break;
      }
    }

    // 응답 전송
    res.status(200).send({
      status: 200,
      message: `[Update Result] Offline: ${updateResult.off} - ${newLength.off}, Online: ${updateResult.on} - ${newLength.on}, Dept: ${updateResult.dept} - ${newLength.dept}`,
      data: filter ? filteredCourseList : courseList,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Invalid type.") {
      message = err.message;
      errCode = 400;
    } else if (err.message === "Invalid order.") {
      message = err.message;
      errCode = 400;
    } else if (err.message === "Invalid filter.") {
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

// 최신 강좌 목록 조회
courseController.readNew = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    // 데이터 조회
    const course = await Course.findAll({
      attributes: [
        "type",
        "id",
        "title",
        "applyStartDate",
        "applyEndDate",
        "isFree",
        "category",
      ],
      limit: 10,
      order: [
        ["insertDate", "DESC"],
        ["applyStartDate", "DESC"],
      ],
    }).then((res) => {
      return res;
    });

    // 응답 전송
    res.status(200).send({
      status: 200,
      data: course,
    });
  } catch (err) {
    console.error(err);
    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

export default courseController;
