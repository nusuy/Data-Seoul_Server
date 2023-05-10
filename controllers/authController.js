import axios from "axios";
import dotenv from "dotenv";
import models from "../models/index.js";
import {
  createHashedPassword,
  verifyPassword,
  createHashedDeviceToken,
} from "../utils/hash.js";
import { getJWT, getRefresh } from "../utils/jwt.js";
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

// 이메일 로그인
authController.login = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;

  try {
    const email = req.body.email;
    const password = req.body.password;
    const deviceToken = req.body.deviceToken;

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

    if (!deviceToken) {
      throw new Error("Device Token Required.");
    }

    const userId = user.id;
    const nickname = user.nickname;
    const userPassword = user.password;
    const salt = user.passwordSalt;

    // 비밀번호 확인
    // 비밀번호 불일치
    if (!(await verifyPassword(password, salt, userPassword))) {
      throw new Error("Incorrect Password.");
    }

    // accessToken & refreshToken 발급
    const token = getJWT({ userId, nickname, email });
    const refresh = getRefresh({ userId, nickname, email });

    // Redis 내 토큰 정보 저장
    // A. accessToken (1 h)
    await redisCli
      .set(token, String(userId), {
        EX: 60 * 60,
      })
      .then(() => {
        console.log(`[Redis] User ${userId} : Token Saved Successfully.`);
      });
    // B. refreshToken (14 d)
    await redisCli
      .set(`${userId}refresh`, refresh, {
        EX: 60 * 60 * 24 * 14,
      })
      .then(() => {
        console.log(
          `[Redis] User ${userId} : Refresh Token Saved Successfully.`
        );
      });

    // 응답 전달
    res.status(200).send({
      status: 200,
      message: "Signed In Successfully.",
      data: {
        userId: userId,
        accessToken: token,
        refreshToken: refresh,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Not a member.") {
      message = err.message;
      errCode = 401;
    } else if (err.message === "Device Token Required.") {
      message = err.message;
      errCode = 400;
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

// 소셜 로그인
authController.loginKakao = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const code = req.query.code;
    const deviceToken = req.body.deviceToken;

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
    const profile = await axios.get(`${process.env.KAKAO_API_URL}/v2/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!profile.data.kakao_account.email) {
      throw new Error("Email Consent Needed.");
    }

    if (!deviceToken) {
      throw new Error("Device Token Required.");
    }

    const { hashedToken, ivString } = createHashedDeviceToken(deviceToken);
    const email = profile.data.kakao_account.email;
    const kakaoUserId = profile.data.id;

    // 회원조회
    let user = await User.findOne({
      where: { email: email },
    });

    if (user) {
      const userId = user["id"];
      const nickname = user["nickname"];

      // device token 저장
      await User.update(
        {
          salt: kakaoUserId,
          deviceToken: hashedToken,
          iv: ivString,
        },
        { where: { id: userId } }
      );

      // accessToken & refreshToken 발급
      const email = user["email"];
      const token = getJWT({ userId, nickname, email });
      const refresh = getRefresh({ userId, nickname, email });

      // Redis 내 토큰 정보 저장
      // A. accessToken (1 h)
      await redisCli
        .set(token, String(userId), {
          EX: 60 * 60,
        })
        .then(() => {
          console.log(`[Redis] User ${userId} : Token Saved Successfully.`);
        });
      // B. refreshToken (14 d)
      await redisCli
        .set(`${userId}refresh`, refresh, {
          EX: 60 * 60 * 24 * 14,
        })
        .then(() => {
          console.log(
            `[Redis] User ${userId} : Refresh Token Saved Successfully.`
          );
        });

      // 응답 전달
      res.status(200).send({
        status: 200,
        message: "[Provider: Kakao] Signed In Successfully.",
        data: {
          userId: userId,
          accessToken: token,
          refreshToken: refresh,
        },
      });
    } else {
      // 새로운 회원
      user = await User.create({
        email: email,
        isSocial: true,
        isAuthorized: true,
        salt: kakaoUserId,
        deviceToken: hashedToken,
        iv: iv,
      }).then((res) => {
        return res;
      });

      // 응답 전달
      res.status(200).send({
        status: 200,
        message:
          "[Provider: Kakao] Authorized Successfully. (Nickname Required.)",
        data: {
          userId: user["id"],
        },
      });
    }
  } catch (err) {
    console.error(err);

    if (err.message === "Email Consent Needed.") {
      message = err.message;
      errCode = 403;
    } else if (err.message === "Device Token Required.") {
      message = err.message;
      errCode = 400;
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

// 소셜 로그인 - 닉네임 설정
authController.setNickname = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const userId = req.params.userId;
    const nickname = req.body.nickname;

    // 유저 조회
    const user = await User.findOne(
      {
        attributes: ["id", "email", "nickname"],
      },
      { where: { id: userId } }
    ).then((res) => {
      return res;
    });

    // 유저 존재 여부 검사
    if (!user) {
      throw new Error("Invalid userId.");
    }

    // 유저 중복 검사
    if (user["nickname"]) {
      throw new Error("User already joined.");
    }

    // nickname 유효성 검사 (공백, 길이)
    if (!nicknameValidation(nickname)) {
      throw new Error("Invalid Nickname.");
    }

    // 데이터 저장
    await User.update(
      {
        nickname: nickname,
        joinDate: models.sequelize.literal("CURRENT_TIMESTAMP"),
      },
      { where: { id: userId } }
    );

    // accessToken & refreshToken 발급
    const email = user["email"];
    const token = getJWT({ userId, nickname, email });
    const refresh = getRefresh({ userId, nickname, email });

    // Redis 내 토큰 정보 저장
    // A. accessToken (1 h)
    await redisCli
      .set(token, String(userId), {
        EX: 60 * 60,
      })
      .then(() => {
        console.log(`[Redis] User ${userId} : Token Saved Successfully.`);
      });
    // B. refreshToken (14 d)
    await redisCli
      .set(`${userId}refresh`, refresh, {
        EX: 60 * 60 * 24 * 14,
      })
      .then(() => {
        console.log(
          `[Redis] User ${userId} : Refresh Token Saved Successfully.`
        );
      });

    // 응답 전달
    res.status(200).send({
      status: 200,
      message: "Signed In Successfully.",
      data: {
        userId: userId,
        accessToken: token,
        refreshToken: refresh,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

// 이메일 인증코드 요청
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
        // 이전에 인증 시도 했으나 가입 완료하지 않은 경우
        await User.destroy({ where: { email: email } });
      }
    }

    // DB 저장
    await User.create({
      email: email,
      isSocial: false,
      isAuthorized: false,
    });

    // 인증코드 전송
    sendEmailCode(email);

    // 응답 전달
    res.status(200).send({
      status: 200,
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

// 이메일 인증코드 확인
authController.verifyEmailCode = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const email = req.body.email;
    const userCode = req.body.code;

    const code = await redisCli.get(email);

    // 인증 요청한 이메일이 아닐 경우
    const user = await User.findOne({
      where: {
        email: email,
      },
    }).then((res) => {
      return res;
    });

    // 인증코드를 요청한 이메일이 아닐 경우
    if (!user) {
      throw new Error("Invalid Email.");
    }

    // 이미 인증 완료된 이메일인 경우
    if (user["isAuthorized"]) {
      throw new Error("Invalid Email.");
    }

    // 인증코드 내역이 존재하지 않는 이메일일 경우
    if (!code) {
      throw new Error("Code Expired");
    }

    // 코드가 일치하지 않을 경우
    if (code !== userCode) {
      throw new Error("Invalid Code.");
    }

    // DB 업데이트
    await User.update(
      {
        isAuthorized: true,
      },
      { where: { email: email } }
    );

    // 응답 전달
    res.status(200).send({
      status: 200,
      message: "Authorized Successfully.",
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Invalid Email.") {
      message = err.message;
      errCode = 400;
    } else if (err.message === "Invalid Code.") {
      message = err.message;
      errCode = 401;
    } else if (err.message === "Code Expired.") {
      message = err.message;
      errCode = 403;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

// 이메일 가입
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
        passwordSalt: salt,
      },
      {
        where: {
          email: email,
        },
      }
    );

    // 응답 전송
    res.status(200).send({
      status: 200,
      message: "Joined Successfully.",
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

// refresh token
authController.refresh = async (req, res) => {
  try {
    // 새로운 access token / refresh token 발급
    const userId = req.userId;
    const nickname = req.nickname;
    const email = req.email;
    const payload = { userId, nickname, email };

    const newAccess = getJWT(payload);
    const newRefresh = getRefresh(payload);

    // Redis 내 토큰 정보 저장
    // A. accessToken 1 h
    await redisCli
      .set(newAccess, String(userId), {
        EX: 60 * 60,
      })
      .then(() => {
        console.log(`[Redis] User ${userId} : Token Saved Successfully.`);
      });

    // B. refreshToken 14 d
    await redisCli
      .set(`${userId}refresh`, newRefresh, {
        EX: 60 * 60 * 24 * 14,
      })
      .then(() => {
        console.log(
          `[Redis] User ${userId} : Refresh Token Updated Successfully.`
        );
      });

    // 응답 전달
    res.status(200).send({
      status: 200,
      message: "Token Updated Successfully.",
      data: {
        accessToken: newAccess,
        refreshToken: newRefresh,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: 500,
      message: "Server Error.",
    });
  }
};

// 로그아웃
authController.logout = async (req, res) => {
  try {
    const token = req.token;
    const userId = req.user;
    const user = await User.findOne({
      where: { id: userId },
    }).then((res) => {
      return res;
    });

    // 소셜 로그인일 경우 소셜 로그아웃
    if (user["isSocial"]) {
      // kakao logout
      await axios
        .post(
          `${process.env.KAKAO_API_URL}/v1/user/logout`,
          {
            target_id_type: "user_id",
            target_id: user["salt"],
          },
          {
            headers: {
              "Content-type": "application/x-www-form-urlencoded;",
              Authorization: `KakaoAK ${process.env.KAKAO_APP_ADMIN_KEY}`,
            },
          }
        )
        .then(() => {
          console.log("[Provider: Kakao] Signed out Successfully.");
        });
    }

    // Redis 내 accessToken, refreshToken 정보 삭제
    await redisCli.del(token).then(() => {
      console.log(`[Redis] User ${userId} : Token Removed Successfully.`);
    });
    await redisCli.del(`${userId}refresh`).then(() => {
      console.log(
        `[Redis] User ${userId} : Refresh Token Removed Successfully.`
      );
    });

    console.log("Updated Successfully.");

    res.status(200).send({
      status: 200,
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

// 회원탈퇴
authController.leave = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const userId = req.user;
    const token = req.token;
    const user = await User.findOne({
      where: { id: userId },
    });

    // kakao unlink (kakao 로그인 유저일 경우)
    if (user["isSocial"]) {
      await axios
        .post(
          `${process.env.KAKAO_API_URL}/v1/user/unlink`,
          {
            target_id_type: "user_id",
            target_id: user["salt"],
          },
          {
            headers: {
              "Content-type": "application/x-www-form-urlencoded;",
              Authorization: `KakaoAK ${process.env.KAKAO_APP_ADMIN_KEY}`,
            },
          }
        )
        .then((res) => {
          console.log("[Provider: Kakao] Removed Successfully.");
          console.log(res);
        });
    }

    // Redis 정보 삭제
    await redisCli.del(token).then(() => {
      console.log(`[Redis] User ${userId} : Token Removed Successfully.`);
    });
    await redisCli.del(`${userId}refresh`).then(() => {
      console.log(
        `[Redis] User ${userId} : Refresh Token Removed Successfully.`
      );
    });

    // 데이터 삭제
    await User.destroy({ where: { id: userId } });

    res.status(200).send({
      status: 200,
      message: "Account deleted Successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

export default authController;
