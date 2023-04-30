import dotenv from "dotenv";
import axios from "axios";
import models from "../../models/index.js";
import insertData from "./insertData.js";
import checkDuplicate from "./checkDuplicate.js";
import addDB from "./addDB.js";

dotenv.config();
const System = models.System;

const renewalDeptData = async (recentLog) => {
  // 1. 데이터 가져오기
  let dataCount = 0; // 전체 데이터 개수
  let count = 0; // 전체 개수 / 1000
  let remainderDataCount = 0; // 전체 개수 % 1000
  const SERVICE = process.env.OPEN_API_SERVICE_NAME_DEPT;

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

  // 2. 데이터 정제
  // 2-1. 테스트 데이터 제외
  // 2-2. 데이터 중복 여부 검사 후 새로운 데이터만 저장
  const result = [];
  const current = recentLog.now;
  for (const set of dataResult) {
    for (const item of set) {
      const data = insertData(current, item, "dept");
      const isTest =
        data["name"].toLowerCase() === "test" || data["name"] === "테스트";
      if (!isTest && !(await checkDuplicate(data))) {
        result.push(data);
      }
    }
  }

  // 2-3. 기관 이름이 같은 데이터 검사
  const filteredData = [];
  result.map((item) => {
    const name = item["name"];
    const arr = [];
    if (item["lng"] && item["lat"]) {
      arr.push(item);
    }

    result.map((value) => {
      // lng, lat 값이 있는 값으로 선별
      if (value["name"].includes(name) && value.lng && value.lat) {
        arr.push(value);
      }
    });

    if (arr.length === 0) {
      filteredData.push(item);
    } else {
      filteredData.push(arr[0]);
    }
  });

  // 3. DB에 저장
  // 3-1. log의 데이터 개수 수정
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
  // 3-2. Dept 데이터 저장
  filteredData.map((item) => {
    addDB(item, "dept");
  });

  return result.length;
};

export default renewalDeptData;
