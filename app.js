import express from "express";
import dotenv from "dotenv";
import db from "./models/index.js";
import Auth from "./routes/Auth.js";
import Course from "./routes/Course.js";
import Post from "./routes/Post.js";
import Comment from "./routes/Comment.js";
import Mypage from "./routes/Mypage.js";

// env
dotenv.config();

// express
const app = express();
app.use(express.json());
const PORT = process.env.SERVER_PORT;

// sequelize ORM
db.sequelize
  .sync({ force: false })
  .then(() => {
    console.log(`Database Connected`);
  })
  .catch((err) => {
    console.error(err);
  });

// routers
app.use("/auth", Auth);
app.use("/course", Course);
app.use("/post", Post);
app.use("/comment", Comment);
app.use("/mypage", Mypage);

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
