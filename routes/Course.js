import express from "express";
import courseController from "../controllers/courseController.js";
import validateAccessToken from "../middlewares/validateAccessToken.js";

const router = express.Router();

// 강좌 목록 조회
router.get("/:type", courseController.readList);

// 강좌 세부 조회
router.get("/detail/:courseId", courseController.readDetail);

// 찜 추가 및 삭제
router.post("/:courseId", validateAccessToken, courseController.addLike);

export default router;
