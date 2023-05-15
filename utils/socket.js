import { Sequelize } from "sequelize";
import redisCli from "./redisCli.js";
import models from "../models/index.js";
import validateAccessTokenForSocket from "./validateAccessTokenForSocket.js";

const Post = models.Post;
const Comment = models.Comment;
const Course = models.Course;
const System = models.System;
const Wishlist = models.Wishlist;
const Notification = models.Notification;
const Op = Sequelize.Op;
const sequelize = models.sequelize;

const socket = (io) => {
  io.on("connection", (socket) => {
    console.log(`[ ${socket.id} ] Socket connection established.`);

    // 구독
    socket.on("subscribe", async (data) => {
      const userId = data;

      // redis에 id 저장
      await redisCli.set(`${userId}socket`, socket.id).then(() => {
        console.log(`[Redis] User ${userId} : Socket Id Saved Successfully.`);
      });
    });

    // 정기 알림 (새로운 강좌, 찜 수강신청 마지막 날)
    socket.on("regular", async (data) => {
      const token = data;
      const { status, message, userId } = await validateAccessTokenForSocket(
        token
      );

      // 새로운 강좌
      const recentDate = await System.findOne({
        where: { [Op.or]: [{ category: "off" }, { category: "on" }] },
        order: [["logDate", "DESC"]],
      }).then((res) => {
        return res ? res["logDate"] : res;
      });

      const now = new Date().getDate();

      // 최근 갱신 Log가 최근 날짜일 경우
      if (recentDate && recentDate.getDate() >= now - 1) {
        // notification 전달 내용
        const notify = {
          target: "everyone",
          isNewAvailable: true,
        };

        // 모든 client에게 알림 전송
        io.sockets.emit("regular", notify);
      }

      // 찜 수강신청 마지막 날
      if (!status) {
        // token validation 실패한 경우
        io.to(socket.id).emit("regular", `[ Failed ] ${message}`);
      } else {
        // 관심 강좌 조회
        const list = await Wishlist.findAll({
          where: { userId: userId },
          attributes: [
            [sequelize.literal("Course.id"), "courseId"],
            [sequelize.literal("Course.applyEndDate"), "applyEndDate"],
          ],
          include: [{ model: Course, attributes: [] }],
        }).then((res) => {
          return res;
        });

        list.map((item) => {
          const applyEndDate = new Date(
            item["dataValues"]["applyEndDate"]
          ).getDate();

          if (now <= applyEndDate && now >= applyEndDate - 3) {
            const notify = {
              target: userId,
              courseId: item["dataValues"]["courseId"],
              remaining: applyEndDate - now,
            };
            io.to(socket.id).emit("regular", notify);
          }
        });
      }
    });

    // 댓글 작성
    socket.on("comment", async (data) => {
      // 댓글이 작성된 postId
      const postId = Number(data);
      let writer = null;

      if (postId) {
        // postId로 게시글 작성자 조회
        writer = await Post.findOne({
          where: { id: postId },
        }).then((res) => {
          if (res) {
            return res["userId"];
          }
        });
      }

      if (writer) {
        // notification 데이터 저장
        await Notification.create({
          category: "comment",
          userId: writer,
          sourceId: postId,
        });

        // notification 전달 내용
        const notify = {
          target: writer,
          postId: postId,
        };

        // 게시글 작성자 socket id 조회
        const writerId = await redisCli.get(`${writer}socket`);

        // 알림 전송
        if (writerId) {
          io.to(writerId).emit("comment", notify);
        }
      } else {
        const message = !data
          ? "[ Transmission Failed ] Value Required."
          : "[ Transmission Failed ] Invalid Value.";

        io.to(socket.id).emit("comment", message);
      }
    });

    // 댓글-답글 작성
    socket.on("reply", async (data) => {
      // 답글이 작성된 commentId
      const commentId = Number(data);
      let comment = null;

      // commentId로 원댓글 조회
      if (commentId) {
        comment = await Comment.findOne({
          where: { id: commentId },
          attributes: [
            "userId",
            "postId",
            [sequelize.literal("Post.userId"), "writerId"],
          ],
          include: [{ model: Post, attributes: [] }],
        }).then((res) => {
          return res ? res["dataValues"] : res;
        });
      }

      if (comment) {
        // notification 데이터 저장 (게시글 작성자, 댓글 작성자)
        await Notification.create({
          category: "comment",
          userId: comment["writerId"],
          sourceId: comment["postId"],
        });
        await Notification.create({
          category: "reply",
          userId: comment["userId"],
          sourceId: commentId,
        });

        // notification 전달 내용
        const commentNotify = {
          target: comment["writerId"],
          postId: comment["postId"],
        };
        const replyNotify = {
          target: comment["userId"],
          postId: comment["postId"],
          commentId: commentId,
        };

        const postWriterId = await redisCli.get(`${comment["writerId"]}socket`);
        const commentWriterId = await redisCli.get(
          `${comment["userId"]}socket`
        );

        // 알림 전송
        if (postWriterId) {
          io.to(postWriterId).emit("comment", commentNotify);
        }
        if (commentWriterId) {
          io.to(commentWriterId).emit("reply", replyNotify);
        }
      } else {
        const message = !data
          ? "[ Transmission Failed ] Value Required."
          : "[ Transmission Failed ] Invalid Value.";

        io.to(socket.id).emit("reply", message);
      }
    });

    // 연결 종료
    socket.on("disconnect", async (data) => {
      const userId = data;
      // redis 내 id 삭제
      await redisCli.del(`${userId}socket`).then(() => {
        console.log(`[Redis] User ${userId} : Socket Id Removed Successfully.`);
        console.log("Socket disconnected.");
      });
    });

    // socket error
    socket.on("error", (error) => {
      console.error(error);
      io.to(socket.id).emit("error", error);
    });
  });
};

export default socket;
