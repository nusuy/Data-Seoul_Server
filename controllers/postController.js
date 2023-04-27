import models from "../models/index.js";

const Post = models.Post;
const Comment = models.Comment;
const User = models.User;

const postController = {};

const findNickname = async (userId) => {
  const nickname = await User.findOne({
    attributes: ["nickname"],
    where: {
      id: userId,
    },
  }).then((res) => {
    return res;
  });

  const result = nickname ? nickname["dataValues"]["nickname"] : null;

  return result;
};

const commentCount = async (postId) => {
  const comments = await Comment.findAll({
    where: {
      postId: postId,
    },
  }).then((res) => {
    return res;
  });

  return comments.length;
};

// 게시글 목록 조회
postController.readList = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    // 제목, 내용, 작성자, 작성일시, 댓글 수
    const list = await Post.findAll({
      attributes: [
        "id",
        "title",
        "content",
        "userId",
        "publishDate",
        "viewCount",
      ],
    }).then((res) => {
      return res;
    });

    // 목록이 없을 경우
    if (list.length === 0) {
      res.status(200).send({
        status: 200,
        message: "No Result.",
        data: null,
      });

      return;
    }

    const result = [];
    for (const post of list) {
      const nickname = await findNickname(post["userId"]);
      const comments = await commentCount(post["id"]);
      const postData = {};

      postData.postId = post["id"];
      postData.title = post["title"];
      postData.content = post["content"];
      postData.userId = post["userId"];

      if (!nickname) {
        postData.userNickname = "Member not found.";
      } else {
        postData.userNickname = nickname;
      }

      postData.publishDate = post["publishDate"];
      postData.viewCount = post["viewCount"];
      postData.commentCount = comments;

      result.push(postData);
    }

    res.status(200).send({
      status: 200,
      message: "Successfully Loaded.",
      data: result,
    });
  } catch (err) {
    console.error(err);
    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

// 게시글 세부 조회
postController.readDetail = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const postId = req.params.postId;

    // 게시글 데이터 조회
    const post = await Post.findOne({
      attributes: [
        "id",
        "title",
        "content",
        "userId",
        "publishDate",
        "viewCount",
      ],
      where: {
        id: postId,
      },
    }).then((res) => {
      return res;
    });

    // 게시물이 없을 경우
    if (!post) {
      throw new Error("Invalid PostId.");
    }

    const result = {};
    const nickname = await findNickname(post["userId"]);

    result.postId = post["id"];
    result.title = post["title"];
    result.content = post["content"];
    result.userId = post["userId"];

    if (!nickname) {
      result.userNickname = "Member not found.";
    } else {
      result.userNickname = nickname;
    }

    result.publishDate = post["publishDate"];
    result.viewCount = post["viewCount"] + 1;

    // 조회 수 증가
    await Post.increment({ viewCount: 1 }, { where: { id: postId } });

    // 응답 전송
    res.status(200).send({
      status: 200,
      data: result,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Invalid PostId.") {
      message = err.message;
      errCode = 400;
    }

    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

// 게시물 작성
postController.newPost = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const userId = req.user;
    const title = req.body.title;
    const content = req.body.content;

    // 값 유효성 검사
    if (!title || !content) {
      throw new Error("No value.");
    } else if (title.length > 40) {
      throw new Error("Title is too long.");
    } else if (!title.trim()) {
      throw new Error("Title is Empty.");
    } else if (!content.trim()) {
      throw new Error("Content is Empty.");
    }

    // DB 저장
    const postId = await Post.create({
      userId: userId,
      title: title,
      content: content,
    }).then((res) => {
      return res["id"];
    });

    // 응답 전송
    res.status(200).send({
      status: 200,
      message: "Successfully Saved.",
      postId: postId,
    });
  } catch (err) {
    console.error(err);
    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

// 게시물 삭제
postController.removePost = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const postId = req.params.postId;
  } catch (err) {
    console.error(err);
    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

// 게시물 수정
postController.editPost = async (req, res) => {
  let message = "Server Error.";
  let errCode = 500;
  try {
    const postId = req.params.postId;
  } catch (err) {
    console.error(err);
    res.status(errCode).send({
      status: errCode,
      message: message,
    });
  }
};

export default postController;
