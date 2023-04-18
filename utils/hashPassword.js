import util from "util";
import { pbkdf2, randomBytes } from "crypto";

const randomBytesPromise = util.promisify(randomBytes);
const pdkdf2Promise = util.promisify(pbkdf2);

const createSalt = async () => {
  const buf = await randomBytesPromise(64);
  return buf.toString("base64");
};

// 암호화 비밀번호 생성
export const createHashedPassword = async (password) => {
  const salt = await createSalt();
  const key = await pdkdf2Promise(password, salt, 104907, 64, "sha512");
  const hashedPassword = key.toString("base64");

  return { hashedPassword, salt };
};

// 비밀번호 검증 (userPassword: DB 저장 비밀번호)
export const verifyPassword = async (password, userSalt, userPassword) => {
  const key = await pdkdf2Promise(password, userSalt, 99999, 64, "sha512");
  const hashedPassword = key.toString("base64");

  return hashedPassword === userPassword;
};
