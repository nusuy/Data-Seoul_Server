import dotenv from "dotenv";
import models from "../../models/index.js";
import checkRecentLog from "./checkRecentLog.js";
import renewalCourseData from "./renewalCourseData.js";
import renewalDeptData from "./renewalDeptData.js";

const System = models.System;
dotenv.config();

const renewalData = async () => {
  let recentLog, now;
  const error = { off: false, on: false, dept: false };
  const newLength = { off: 0, on: 0, dept: 0 };

  // Offline Course
  try {
    now = new Date();
    // 최근 로그 검사 및 새로운 로그 등록
    recentLog = await checkRecentLog("off");

    // 데이터 등록
    if (recentLog.needUpdate) {
      await renewalCourseData(true, recentLog).then((res) => {
        newLength.off = res;
      });
    }
  } catch (err) {
    console.error(err);
    if (recentLog.needUpdate) {
      await System.destroy({
        where: { id: recentLog.newLogId },
      });
    }
    error.off = true;
  }

  // Online Course
  try {
    now = new Date();
    recentLog = await checkRecentLog("on");

    if (recentLog.needUpdate) {
      await renewalCourseData(false, recentLog).then((res) => {
        newLength.on = res;
      });
    }
  } catch (err) {
    console.error(err);
    if (recentLog.needUpdate) {
      await System.destroy({
        where: { id: recentLog.newLogId },
      });
    }
    error.on = true;
  }

  // Dept
  try {
    now = new Date();
    recentLog = await checkRecentLog("dept");

    if (recentLog.needUpdate) {
      await renewalDeptData(recentLog).then((res) => {
        newLength.dept = res;
      });
    }
  } catch (err) {
    console.error(err);
    if (recentLog.needUpdate) {
      await System.destroy({
        where: { id: recentLog.newLogId },
      });
    }
    error.dept = true;
  }

  let errorData = "";
  if (!error.off && !error.on && !error.dept) {
    errorData = "Successfully Updated.";

    return { errorData, newLength };
  }

  if (error.off) {
    errorData += "Offline";
  }

  if (error.off && error.on) {
    errorData += ", Online";
  } else if (!error.off && error.on) {
    errorData += "Online";
  }

  if ((error.off || error.on) && error.dept) {
    errorData += ", Dept";
  } else if (!error.off && !error.on && error.dept) {
    errorData += "Dept";
  }

  return { errorData, newLength };
};

export default renewalData;
