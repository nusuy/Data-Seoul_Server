import dotenv from "dotenv";
import models from "../models/index.js";
import axios from "axios";
import parseDate from "./parseDate.js";
import parseOnlineApplyDate from "./parseOnlineApplyDate.js";

const System = models.System;
const Course = models.Course;
const Dept = models.Dept;

dotenv.config();

const checkRecentUpdate = (date, now) => {
  // 최근 갱신 날짜보다 24시간 지난 시점이라면 true
  console.log(new Date(date.setDate(date.getHours() + 24)).toDateString());
  return date.setDate(date.getHours() + 24) <= now;
};

const checkNull = (value) => {
  return value === "" ? null : value;
};

const checkDuplicate = async (item) => {
  const res = await Dept.findOne({
    where: {
      name: item["DEPT_NM"],
    },
  }).then((res) => {
    return res;
  });

  return res ? true : false;
};

const checkLatLng = async (latData, lngData) => {
  // lat, lng 값이 반대로 저장된 데이터일 경우 두 값 바꿔주기
  let lat = Number(latData);
  let lng = Number(lngData);

  if (lat === NaN || lng === NaN) {
    lat = null;
    lng = null;
  } else if (lat > 100 && lng < 100) {
    const temp = lat;
    lat = lng;
    lng = temp;
  }

  return { lat, lng };
};

const insertData = (data, type) => {
  const result = {};
  const lat = type === "dept" ? data["MAP_LAT"] : data["MAP_LATITUDE"];
  const lng = type === "dept" ? data["MAP_LNG"] : data["MAP_LONGITUDE"];
  const { checkedLat, checkedLng } = checkLatLng(lat, lng);

  switch (type) {
    case "off":
      result.type = "offline";
      result.title = data["COURSE_NM"];
      result.url = checkNull(data["COURSE_APPLY_URL"]);
      result.applyStartDate = parseDate(data["COURSE_REQUEST_STR_DT"], true);
      result.applyEndDate = parseDate(data["COURSE_REQUEST_END_DT"], true);
      result.startDate = parseDate(data["COURSE_STR_DT"], true);
      result.endDate = parseDate(data["COURSE_END_DT"], true);
      result.deptName = checkNull(data["DEPT_NM"]);
      result.deptGu = checkNull(data["GU"]);
      result.deptLat = checkedLat;
      result.deptLng = checkedLng;
      result.capacity = data["CAPACITY"] === "" ? 0 : Number(data["CAPACITY"]);
      break;
    case "on":
      const { applyStart, applyEnd } = parseOnlineApplyDate(
        data["COURSE_REQUEST_DT"]
      );

      result.type = "online";
      result.title = data["COURSE_NM"];
      result.applyStartDate = parseDate(applyStart, true);
      result.applyEndDate = parseDate(applyEnd, true);
      result.startDate = checkNull(data["COURSE_DT"]);
      result.deptName = checkNull(data["DEPT_NAME"]);
      result.deptGu = checkNull(data["DEPT_GU"]);
      result.deptLat = checkedLat;
      result.deptLng = checkedLng;
      result.isFree = data["FEE"] === "무료" ? true : false;
      result.isAvailable = data["STATUS"] === "ING" ? true : false;
      break;
    case "dept":
      result.name = checkNull(data["DEPT_NM"]);
      result.tel = checkNull(data["TEL"]);
      result.addr = checkNull(data["ADDR"]);
      result.url = checkNull(data["HOMEPAGE_URL"]);
      result.lat = checkedLat;
      result.lng = checkedLng;
      break;
  }

  return result;
};

const addDB = async (data, type) => {
  switch (type) {
    case "off":
      await Course.create({
        type: data["type"],
        title: data["title"],
        url: data["url"],
        applyStartDate: data["applyStartDate"],
        applyEndDate: data["applyEndDate"],
        startDate: data["startDate"],
        endDate: data["endDate"],
        deptName: data["deptName"],
        deptGu: data["deptGu"],
        deptLat: data["deptLat"],
        deptLng: data["deptLng"],
        capacity: data["capacity"],
        isAvailable: data["isAvailable"],
      });
      break;
    case "on":
      await Course.create({
        type: data["type"],
        title: data["title"],
        url: data["url"],
        applyStartDate: data["applyStartDate"],
        applyEndDate: data["applyEndDate"],
        startDate: data["startDate"],
        deptName: data["deptName"],
        deptGu: data["deptGu"],
        deptLat: data["deptLat"],
        deptLng: data["deptLng"],
        isFree: data["isFree"],
        isAvailable: data["isAvailable"],
      });
      break;
    case "dept":
      await Dept.create({
        name: data["name"],
        tel: data["tel"],
        addr: data["addr"],
        url: data["url"],
        lat: data["lat"],
        lng: data["lng"],
      });
      break;
  }
};

export const renewalCourseData = async (isOffline) => {
  const now = new Date();
  const type = isOffline ? "off" : "on";

  // 1. 최근 갱신 날짜 확인
  const recentUpdate = await System.findAll({
    where: {
      category: type,
    },
    order: [["renewalDate", "DESC"]],
    limit: 1,
  }).then((res) => {
    return res[0] ? res[0]["dataValues"].renewalDate : null;
  });

  // 2. log 등록
  const needUpdate = recentUpdate ? checkRecentUpdate(recentUpdate, now) : true;
  let logId = null;
  if (needUpdate) {
    logId = await System.create({
      category: type,
      renewalDate: models.sequelize.literal("CURRENT_TIMESTAMP"),
    }).then((res) => {
      return res["dataValues"].id;
    });
  }
  try {
    // 3. 데이터 가져오기
    let dataCount = 0;
    let remainderDataCount = 0;
    let count = 0;
    const SERVICE = isOffline
      ? process.env.OPEN_API_SERVICE_NAME_OFFLINE
      : process.env.OPEN_API_SERVICE_NAME_ONLINE;

    // 3-1. 전체 데이터 개수 가져오기
    await axios
      .get(
        `${process.env.OPEN_API_BASE_URL}/${process.env.OPEN_API_KEY}/json/${SERVICE}/1/1`
      )
      .then((res) => {
        dataCount = res.data[SERVICE].list_total_count;
        remainderDataCount = dataCount % 1000;
        count = Math.ceil(dataCount / 1000);
      })
      .catch((err) => {
        console.error(err);
        throw new Error("Open API request failed.");
      });

    // 3-2. 데이터 개수에 따라 전체 데이터 가져오기
    const dataResult = [];
    for (let i = 0; i < count; i++) {
      const index =
        i + 1 === count ? 1000 * i + remainderDataCount : 1000 * (i + 1);
      await axios
        .get(
          `${process.env.OPEN_API_BASE_URL}/${
            process.env.OPEN_API_KEY
          }/json/${SERVICE}/${index - 999}/${index}`
        )
        .then((res) => {
          dataResult.push(res.data[SERVICE]["row"]);
        })
        .catch((err) => {
          console.error(err);
          throw new Error("Open API request failed.");
        });
    }

    // // temp
    // await axios
    //   .get(
    //     `${process.env.OPEN_API_BASE_URL}/${process.env.OPEN_API_KEY}/json/${SERVICE}/1/5`
    //   )
    //   .then((res) => {
    //     dataResult.push(res.data[SERVICE]["row"]);
    //   })
    //   .catch((err) => {
    //     console.error(err);
    //     throw new Error("Open API request failed.");
    //   });

    // 3-3. 데이터 등록 일자 확인
    const result = [];
    dataResult.map((set) => {
      set.map((item) => {
        // A. 최근 갱신 이력이 존재하는 경우
        //     -> 데이터 등록 날짜보다 갱신 날짜가 더 이전이어야 데이터 저장
        // B. 5년 이상된 데이터일 경우 저장하지 않음
        const insertDate = parseDate(item["INSERT_DT"], false);
        const data = insertData(item, type);
        const isDateNull =
          !data["applyEndDate"] && !data["applyStartDate"] ? true : false;
        const courseDate = data["applyEndDate"]
          ? new Date(data["applyEndDate"])
          : new Date(data["applyStartDate"]);
        const afterDate = new Date(now.setFullYear(now.getFullYear() - 5));
        const isNew =
          (recentUpdate && insertDate && recentUpdate <= insertDate) ||
          !recentUpdate;

        if (
          (isNew && isDateNull) ||
          (isNew && !isDateNull && courseDate >= afterDate)
        ) {
          result.push(data);
        }
      });
    });

    // 4. DB에 저장
    await System.update(
      {
        count: dataCount,
      },
      {
        where: {
          id: logId,
        },
      }
    );
    result.map((item) => {
      addDB(item, type);
    });
  } catch (err) {
    console.error(err);
    await System.destroy({
      where: { id: logId },
    });
  }
};

export const renewalDeptData = async () => {
  const now = new Date();

  // 1. 최근 갱신 날짜 확인
  const log = await System.findAll({
    where: {
      category: "dept",
    },
    order: [["renewalDate", "DESC"]],
    limit: 1,
  }).then((res) => {
    return res[0] ? res[0]["dataValues"] : null;
  });

  const recentUpdate = log ? log.renewalDate : null;
  const needUpdate = recentUpdate ? checkRecentUpdate(recentUpdate, now) : true;
  if (!needUpdate) {
    return;
  }

  // 2. log 등록
  const logId = await System.create({
    category: "dept",
    renewalDate: models.sequelize.literal("CURRENT_TIMESTAMP"),
  }).then((res) => {
    return res["dataValues"].id;
  });

  try {
    // 3. 데이터 가져오기
    let dataCount = 0; // 전체 데이터 개수
    let count = 0; // 전체 개수 / 1000
    let remainderDataCount = 0; // 전체 개수 % 1000
    const SERVICE = process.env.OPEN_API_SERVICE_NAME_DEPT;

    // 3-1. 전체 데이터 개수 가져오기
    await axios
      .get(
        `${process.env.OPEN_API_BASE_URL}/${process.env.OPEN_API_KEY}/json/${SERVICE}/1/1`
      )
      .then((res) => {
        dataCount = res.data[SERVICE].list_total_count;
        remainderDataCount = dataCount % 1000;
        count = Math.ceil(dataCount / 1000);
      })
      .catch((err) => {
        console.error(err);
        throw new Error("Open API request failed.");
      });

    // 3-2. 데이터 개수와 기존 데이터 개수 비교
    const existingCount = recentUpdate ? log.count : null;
    if (dataCount === existingCount) {
      return;
    }

    // 3-3. 데이터 개수에 따라 전체 데이터 가져오기
    const dataResult = [];
    for (let i = 0; i < count; i++) {
      const index =
        i + 1 === count ? 1000 * i + remainderDataCount : 1000 * (i + 1);
      await axios
        .get(
          `${process.env.OPEN_API_BASE_URL}/${
            process.env.OPEN_API_KEY
          }/json/${SERVICE}/${index - 999}/${index}`
        )
        .then((res) => {
          dataResult.push(res.data[SERVICE]["row"]);
        })
        .catch((err) => {
          console.error(err);
          throw new Error("Open API request failed.");
        });
    }

    // 4. 데이터 정제
    // 4-1. 데이터 중복 여부 검사 후 새로운 데이터만 저장
    const result = [];
    dataResult.map((set) => {
      set.map((item) => {
        if (!checkDuplicate(item)) {
          const data = insertData(item, "dept");
          result.push(data);
        }
      });
    });

    // 4-2. 기관 이름이 같은 데이터 검사
    const filteredData = [];
    result.map((item) => {
      const name = item["name"];
      const arr = [item];
      result.map((value) => {
        // lng, lat 값이 있는 값으로 선별
        if (value.includes(name) && value.lng && value.lat) {
          arr.push(value);
        }
      });

      filteredData.push(arr[0]);
    });

    // 5. DB에 저장
    // 5-1. log의 데이터 개수 수정
    await System.update(
      {
        count: dataCount,
      },
      {
        where: {
          id: logId,
        },
      }
    );
    // 5-2. Dept 데이터 저장
    filteredData.map((item) => {
      addDB(item, "dept");
    });
  } catch (err) {
    console.error(err);
    await System.destroy({
      where: { id: logId },
    });
  }
};
