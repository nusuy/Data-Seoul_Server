import nodemailer from "nodemailer";
import dotenv from "dotenv";
import randomString from "./randomString.js";
import redisCli from "../utils/redisCli.js";

dotenv.config();

const smtpTransport = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmailCode = (email) => {
  const code = randomString(6);

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "[평생학습 포털 모바일] 이메일 인증 코드 입력 안내",
    text: `하단의 6자리 인증코드를 회원가입창에 입력하여 회원가입을 완료해주세요.\n해당 코드는 5분 동안 유효합니다.\n인증코드: ${code}\n문제가 발생한 경우 고객센터로 문의 바랍니다.\n감사합니다.`,
  };

  smtpTransport.sendMail(mailOptions, async (err, res) => {
    if (err) {
      console.error(err);
      throw new Error("Failed to Send Email.");
    } else {
      console.log(`${email}: Email Sent Successfully.`);

      // redis 내 인증코드 저장
      await redisCli.set(email, code, {
        EX: 60 * 5, // 5m
      });
    }

    smtpTransport.close();
  });
};

export default sendEmailCode;
