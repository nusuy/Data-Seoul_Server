import models from "../models/index.js";
import { createHashedPassword } from "../utils/hashPassword.js";
import { verifyPassword } from "../utils/hashPassword.js";
import getJWT from "../utils/jwt.js";
import redisCli from "../utils/redisCli.js";

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
    return;
  }
};

userController.loginKakao = async (req, res) => {};

userController.logout = async (req, res) => {};

userController.joinEmail = async (req, res) => {
  const password = req.body.password;
  // password hashing
  const { hashedPassword, salt } = createHashedPassword(password);
};

userController.requestEmailCode = async (req, res) => {};

userController.verifyEmailCode = async (req, res) => {};

export default userController;
