import { renewalCourseData, renewalDeptData } from "../utils/renewalData.js";

const courseController = {};

courseController.readAll = async (req, res) => {
  await renewalCourseData(true);
  await renewalCourseData(false);
  await renewalDeptData();
  res.status(200).send("Success");
};

courseController.readDetail = async (req, res) => {};

courseController.addLike = async (req, res) => {};

export default courseController;
