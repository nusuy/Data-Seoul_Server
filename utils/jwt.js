import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const getJWT = (payload) => {
  const { userId, nickname, email } = payload;

  const token = jwt.sign(
    {
      userId: userId,
      nickname: nickname,
      email: email,
    },
    process.env.JWT_SECRET,
    { expiresIn: 60 * 60 } // 1 시간 후 만료
  );

  return token;
};

export const getRefresh = (payload) => {
  const { userId, nickname, email } = payload;
  const str = "refresh_token";

  const token = jwt.sign(
    {
      userId: userId,
      nickname: nickname,
      email: email,
      string: str,
    },
    process.env.JWT_SECRET,
    { expiresIn: 60 * 60 * 24 * 14 } // 2 주 후 만료
  );

  return token;
};
