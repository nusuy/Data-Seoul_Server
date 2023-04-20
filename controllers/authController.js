import axios from "axios";
import dotenv from "dotenv";
import models from "../models/index.js";
import { createHashedPassword } from "../utils/hashPassword.js";
import { verifyPassword } from "../utils/hashPassword.js";
import getJWT from "../utils/jwt.js";
import redisCli from "../utils/redisCli.js";
import sendEmailCode from "../utils/sendEmailCode.js";
import {
  emailValidation,
  nicknameValidation,
  passwordValidation,
} from "../utils/strValidation.js";

dotenv.config();

const User = models.User;
const authController = {};

authController.login = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;

  try {
    const email = req.body.email;
    const password = req.body.password;

    // 회원 조회
    const user = await User.findOne({
      where: {
        email: email,
      },
    });

    // 미가입 회원
    if (!user) {
      throw new Error("Not a member.");
    }

    const userId = user.id;
    const nickname = user.nickname;
    const userPassword = user.password;
    const salt = user.salt;

    // 비밀번호 확인
    // 비밀번호 불일치
    if (!(await verifyPassword(password, salt, userPassword))) {
      throw new Error("Incorrect Password.");
    }

    // accessToken 발급
    const token = getJWT({ userId, nickname, email });

    // Redis 내 토큰 정보 저장 (1시간)
    await redisCli
      .set(token, String(userId), {
        EX: 60 * 60,
      })
      .then(() => {
        console.log(`[Redis] User ${userId} : Token Saved Successfully.`);
      });

    // 응답 전달
    res.status(200).send({
      status: "Success",
      message: "Signed In Successfully.",
      data: {
        userId: userId,
        accessToken: token,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Not a member.") {
      message = err.message;
      errCode = 401;
    } else if (err.message === "Incorrect Password.") {
      message = err.message;
      errCode = 403;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

authController.loginKakao = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const code = req.query.code;

    // 인가코드 전송
    const result = await axios.post(
      `${process.env.KAKAO_OAUTH_TOKEN_API_URL}?grant_type=${process.env.KAKAO_GRANT_TYPE}&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}&code=${code}`,
      null,
      {
        headers: {
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    const accessToken = result.data["access_token"];

    // 프로필 정보 가져오기
    const profile = await axios.get(`${process.env.KAKAO_PROFILE_URL}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!profile.data.kakao_account.email) {
      throw new Error("Email Consent Needed.");
    }

    const nickname = profile.data.kakao_account.profile.nickname;
    const email = profile.data.kakao_account.email;

    // 회원조회
    let user = await User.findOne({
      where: { email: email },
    });

    if (!user) {
      // 새로운 회원
      await User.create({
        email: email,
        nickname: nickname,
        joinDate: models.sequelize.literal("CURRENT_TIMESTAMP"),
        isSocial: true,
        isAuthorized: true,
      });
      user = await User.findOne({
        where: { email: email },
      });
    }

    const userId = user.id;
    const userNickname = user.nickname;

    // accessToken 발급
    const token = getJWT({ userId, userNickname, email });

    // Redis 내 토큰 정보 저장 (1시간)
    await redisCli
      .set(token, String(userId), {
        EX: 60 * 60,
      })
      .then(() => {
        console.log(`[Redis] User ${userId} : Token Saved Successfully.`);
      });

    // 응답 전달
    res.status(200).send({
      status: "Success",
      message: "Signed In Successfully.",
      data: {
        userId: userId,
        accessToken: token,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Email Consent Needed.") {
      message = err.message;
      errCode = 403;
    } else if (err.message === "Request failed with status code 400") {
      message = "Invalid Authorization Code";
      errCode = 403;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

authController.logout = async (req, res) => {
  try {
    // Redis 내 accessToken 정보 삭제
    const token = req.token;
    const userId = await redisCli.get(token);
    await redisCli.del(token).then(() => {
      console.log(`[Redis] User ${userId} : Token Removed Successfully.`);
    });

    console.log("Updated Successfully.");

    res.status(200).send({
      status: "Success",
      message: "Signed Out Successfully.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: "Error",
      message: "Server Error.",
    });
  }
};

authController.requestEmailCode = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const email = req.body.email;

    if (!emailValidation(email)) {
      throw new Error("Invalid Email.");
    }

    // 중복확인
    const user = await User.findOne({
      where: {
        email: email,
      },
    });

    // 존재 시
    if (user) {
      if (user.nickname) {
        throw new Error("Email Already Exists.");
      } else {
        await User.destroy({ where: { email: email } });
      }
    }

    // 인증코드 전송
    sendEmailCode(email);

    // 응답 전달
    res.status(200).send({
      status: "Success",
      message: "Sent Successfully.",
    });
  } catch (err) {
    console.error(err);

    if (
      err.message === "Email Already Exists." ||
      err.message === "Invalid Email."
    ) {
      message = err.message;
      errCode = 400;
    } else if (err.message === "Failed to Send Email.") {
      message = err.message;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

authController.verifyEmailCode = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const email = req.body.email;
    const userCode = req.body.code;

    const code = await redisCli.get(email);

    // 인증코드 내역이 존재하지 않는 이메일일 경우
    if (!code) {
      throw new Error("Invalid Email.");
    }

    // 코드가 일치하지 않을 경우
    if (code !== userCode) {
      throw new Error("Invalid Code.");
    }

    // DB 저장
    await User.create({
      email: email,
      isSocial: false,
      isAuthorized: true,
    });

    // 응답 전달
    res.status(200).send({
      status: "Success",
      message: "Authorized Successfully.",
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Invalid Code.") {
      message = err.message;
      errCode = 401;
    } else if (err.message === "Invalid Email.") {
      message = err.message;
      errCode = 400;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

authController.joinEmail = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const email = req.body.email;
    const password = req.body.password;
    const nickname = req.body.nickname;

    // email 중복확인
    const user = await User.findOne({
      where: {
        email: email,
      },
    });

    // DB에 이메일 정보 미존재 -> 이메일 인증 필요
    if (!user) {
      throw new Error("Unauthorized Email.");
    }

    // DB에 정보 이미 존재
    if (user.nickname) {
      throw new Error("Email Already Exists.");
    }

    // password 유효성 확인 (공백, 길이)
    if (!passwordValidation(password)) {
      throw new Error("Invalid Password.");
    }

    // nickname 유효성 확인 (공백, 길이)
    if (!nicknameValidation(nickname)) {
      throw new Error("Invalid Nickname.");
    }

    // password hashing
    const { hashedPassword, salt } = await createHashedPassword(password);

    // DB 수정
    await User.update(
      {
        nickname: nickname,
        joinDate: models.sequelize.literal("CURRENT_TIMESTAMP"),
        password: hashedPassword,
        salt: salt,
      },
      {
        where: {
          email: email,
        },
      }
    );

    // 응답 전송
    res.status(200).send({
      status: "Success",
      message: "Signed In Successfully.",
      data: {
        userId: user.id,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Unauthorized Email.") {
      message = err.message;
      errCode = 401;
    } else if (
      err.message === "Email Already Exists." ||
      err.message === "Invalid Password." ||
      err.message === "Invalid Nickname."
    ) {
      message = err.message;
      errCode = 400;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

export default authController;
