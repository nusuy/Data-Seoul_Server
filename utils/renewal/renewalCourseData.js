import dotenv from "dotenv";
import axios from "axios";
import models from "../../models/index.js";
import insertData from "./insertData.js";
import addDB from "./addDB.js";
import { parseDate } from "./checkValue.js";

dotenv.config();
const System = models.System;

const renewalCourseData = async (isOffline, recentLog) => {
  const type = isOffline ? "off" : "on";

  // 1. 데이터 가져오기
  let dataCount = 0;
  let remainderDataCount = 0;
  let count = 0;
  const SERVICE = isOffline
    ? process.env.OPEN_API_SERVICE_NAME_OFFLINE
    : process.env.OPEN_API_SERVICE_NAME_ONLINE;

  // 1-1. 전체 데이터 개수 가져오기
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

  // 1-2. 데이터 개수와 기존 데이터 개수 비교
  const existingCount = recentLog.recentUpdate ? recentLog.log.count : null;
  if (dataCount === existingCount) {
    return;
  }

  // 1-3. 데이터 개수에 따라 전체 데이터 가져오기
  const dataResult = [];
  for (let i = 0; i < count; i++) {
    const endIndex =
      i + 1 === count ? 1000 * i + remainderDataCount : 1000 * (i + 1);
    const startIndex = endIndex === dataCount ? 1000 * i + 1 : endIndex - 999;
    await axios
      .get(
        `${process.env.OPEN_API_BASE_URL}/${process.env.OPEN_API_KEY}/json/${SERVICE}/${startIndex}/${endIndex}`
      )
      .then((res) => {
        dataResult.push(res.data[SERVICE]["row"]);
      })
      .catch((err) => {
        console.error(err);
        throw new Error("Open API request failed.");
      });
  }

  // 2. 데이터 정제
  const result = [];
  const current = recentLog.now;
  dataResult.map((set) => {
    set.map((item) => {
      // A. test 데이터일 경우 저장하지 않음
      // B. 최근 갱신 이력이 존재하는 경우
      //     -> 데이터 등록 날짜보다 갱신 날짜가 더 이전이어야 데이터 저장
      // C. 올해 데이터가 아닐 경우 저장하지 않음
      const data = insertData(current, item, type);
      const isTest =
        data["title"].toLowerCase() === "test" || data["title"] === "테스트";
      const insertDate = parseDate(item["INSERT_DT"], false);
      const isDateNull =
        !data["applyEndDate"] && !data["applyStartDate"] ? true : false;
      const courseDate = data["applyEndDate"]
        ? new Date(data["applyEndDate"])
        : new Date(data["applyStartDate"]);
      const isNew =
        (recentLog.recentUpdate &&
          insertDate &&
          recentLog.recentUpdate <= insertDate) ||
        !recentLog.recentUpdate;

      if (
        (!isTest && isNew && isDateNull) ||
        (!isTest &&
          isNew &&
          !isDateNull &&
          courseDate.getFullYear() === current.getFullYear())
      ) {
        result.push(data);
      }
    });
  });

  // 3. DB에 저장
  await System.update(
    {
      count: dataCount,
    },
    {
      where: {
        id: recentLog.newLogId,
      },
    }
  );
  result.map((item) => {
    addDB(item, type);
  });

  return result.length;
};

export default renewalCourseData;
