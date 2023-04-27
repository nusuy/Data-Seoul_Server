import express from "express";
import courseController from "../controllers/courseController.js";
import validateAccessToken from "../middlewares/validateAccessToken.js";

const router = express.Router();

router.get("/:type", courseController.readList);
router.get("/detail/:courseId", courseController.readDetail);
router.post("/:courseId", validateAccessToken, courseController.addLike);

export default router;
