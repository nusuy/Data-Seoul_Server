import models from "../models/index.js";
import { createHashedPassword } from "../utils/hashPassword.js";
import { verifyPassword } from "../utils/hashPassword.js";
import getJWT from "../utils/jwt.js";
import redisCli from "../utils/redisCli.js";
import sendEmailCode from "../utils/sendEmailCode.js";

const User = models.User;
const userController = {};

userController.login = async (req, res) => {
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
    if (!verifyPassword(userPassword, salt, password)) {
      throw new Error("Incorrect Password.");
    }

    // accessToken 발급
    const token = getJWT({ userId, nickname, email });

    // Redis 내 토큰 정보 저장 (1시간)
    await redisCli.set(token, String(userId), {
      EX: 60 * 60,
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

userController.loginKakao = async (req, res) => {};

userController.logout = async (req, res) => {};

userController.requestEmailCode = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const email = req.body.email;

    // 중복확인
    const user = await User.findOne({
      where: {
        email: email,
      },
    });

    // 존재 시
    if (user) {
      if (user.isAuthroized) {
        throw new Error("Email Already Exists.");
      } else {
        await User.destroy({ where: { email: email } });
      }
    }

    // 인증코드 전송
    sendEmailCode(email);

    // DB 저장
    await User.create({
      email: email,
      isSocial: false,
      isAuthroized: true,
    });

    // 응답 전달
    res.status(200).send({
      status: "Success",
      message: "Sent Successfully.",
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Email Already Exists.") {
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

userController.verifyEmailCode = async (req, res) => {};

userController.joinEmail = async (req, res) => {
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

    if (!user) {
      throw new Error("Unauthorized Email.");
    }

    if (user.password) {
      throw new Error("Email Already Exists.");
    }

    // password hashing
    const { hashedPassword, salt } = createHashedPassword(password);

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
        accessToken: token,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Unauthorized Email.") {
      message = err.message;
      errCode = 401;
    } else if (err.message === "Email Already Exists.") {
      message = err.message;
      errCode = 400;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

export default userController;