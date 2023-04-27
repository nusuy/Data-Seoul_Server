import {
  checkNull,
  checkLatLng,
  parseDate,
  parseOnlineApplyDate,
} from "./checkValue.js";

const insertData = (data, type) => {
  const result = {};
  const latData = type === "dept" ? data["MAP_LAT"] : data["MAP_LATITUDE"];
  const lngData = type === "dept" ? data["MAP_LNG"] : data["MAP_LONGITUDE"];
  const { lat, lng } = checkLatLng(latData, lngData);

  switch (type) {
    case "off":
      result.type = type;
      result.title = data["COURSE_NM"];
      result.url = checkNull(data["COURSE_APPLY_URL"]);
      result.applyStartDate = parseDate(data["COURSE_REQUEST_STR_DT"], true);
      result.applyEndDate = parseDate(data["COURSE_REQUEST_END_DT"], true);
      result.startDate = parseDate(data["COURSE_STR_DT"], true);
      result.endDate = parseDate(data["COURSE_END_DT"], true);
      result.deptName = checkNull(data["DEPT_NM"]);
      result.deptGu = checkNull(data["GU"]);
      result.deptLat = lat;
      result.deptLng = lng;
      result.capacity = data["CAPACITY"] === "" ? 0 : Number(data["CAPACITY"]);
      break;
    case "on":
      const { applyStart, applyEnd } = parseOnlineApplyDate(
        data["COURSE_REQUEST_DT"]
      );
      result.type = type;
      result.title = data["COURSE_NM"];
      result.applyStartDate = parseDate(applyStart, true);
      result.applyEndDate = parseDate(applyEnd, true);
      result.startDate = checkNull(data["COURSE_DT"]);
      result.deptName = checkNull(data["DEPT_NAME"]);
      result.deptGu = checkNull(data["DEPT_GU"]);
      result.deptLat = lat;
      result.deptLng = lng;
      result.isFree = data["FEE"] === "무료" ? true : false;
      result.isAvailable = data["STATUS"] === "ING" ? true : false;
      break;
    case "dept":
      result.name = checkNull(data["DEPT_NM"]);
      result.tel = checkNull(data["TEL"]);
      result.addr = checkNull(data["ADDR"]);
      result.url = checkNull(data["HOMEPAGE_URL"]);
      result.lat = lat;
      result.lng = lng;
      break;
  }

  return result;
};

export default insertData;
