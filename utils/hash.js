import dotenv from "dotenv";
import util from "util";
import { pbkdf2, randomBytes, createCipheriv, createDecipheriv } from "crypto";

dotenv.config();

const randomBytesPromise = util.promisify(randomBytes);
const pdkdf2Promise = util.promisify(pbkdf2);
const CIPHER_KEY = process.env.CIPHER_KEY;

const createSalt = async () => {
  const buf = await randomBytesPromise(64);
  return buf.toString("base64");
};

// 암호화 비밀번호 생성
export const createHashedPassword = async (password) => {
  const salt = await createSalt();
  const key = await pdkdf2Promise(
    password,
    salt,
    Number(process.env.HASH_ITERATION_COUNT),
    64,
    process.env.HASH_ALGORITHM
  );
  const hashedPassword = key.toString("base64");

  return { hashedPassword, salt };
};

// 비밀번호 검증 (userPassword: DB 저장 비밀번호)
export const verifyPassword = async (password, userSalt, userPassword) => {
  const key = await pdkdf2Promise(
    password,
    userSalt,
    Number(process.env.HASH_ITERATION_COUNT),
    64,
    process.env.HASH_ALGORITHM
  );
  const hashedPassword = key.toString("base64");

  return hashedPassword === userPassword;
};

// deviceToken 암호화
export const createHashedDeviceToken = (token) => {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", CIPHER_KEY, iv);
  let hashedToken = cipher.update(token, "utf8", "base64");
  hashedToken += cipher.final("base64");

  return { hashedToken, iv };
};

// deviceToken 복호화
export const decodeHashedDeviceToken = (hashedToken, iv) => {
  const decipher = createDecipheriv("aes-256-cbc", CIPHER_KEY, iv);
  let decodedToken = decipher.update(hashedToken, "base64", "utf8");
  decodedToken += decipher.final("utf8");

  return decodedToken;
};

export const decodeDeviceToken = async (userSalt, userToken) => {};
