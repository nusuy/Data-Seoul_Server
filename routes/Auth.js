import express from "express";
import authController from "../controllers/authController.js";
import validateAccessToken from "../middlewares/validateAccessToken.js";

const router = express.Router();

// 로그인
router.post("/login", authController.login);

// 소셜 로그인
router.post("/login/kakao", authController.loginKakao);

// 로그아웃
router.post("/logout", validateAccessToken, authController.logout);

// 이메일 가입
router.post("/join", authController.joinEmail);

// 이메일 인증코드 요청
router.post("/email", authController.requestEmailCode);

// 이메일 인증코드 확인
router.post("/email/code", authController.verifyEmailCode);

export default router;
