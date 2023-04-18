import express from "express";
import userController from "../controllers/userController.js";
import validateAccessToken from "../middlewares/validateAccessToken.js";

const router = express.Router();

// 로그인
router.post("/login", userController.login);

// 소셜 로그인
router.post("/login/kakao", userController.loginKakao);

// 로그아웃
router.post("/logout", validateAccessToken, userController.logout);

// 이메일 가입
router.post("/join", userController.joinEmail);

// 이메일 인증코드 요청
router.post("/email", userController.requestEmailCode);

// 이메일 인증코드 확인
router.post("/email/code", userController.verifyEmailCode);

export default router;
