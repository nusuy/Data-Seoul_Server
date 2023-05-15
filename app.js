import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import db from "./models/index.js";
import socket from "./utils/socket.js";
import Auth from "./routes/Auth.js";
import Course from "./routes/Course.js";
import Post from "./routes/Post.js";
import Comment from "./routes/Comment.js";
import Mypage from "./routes/Mypage.js";
import Search from "./routes/Search.js";
//import Notification from "./routes/Notification.js";

// env
dotenv.config();

// express
const app = express();
app.use(express.json());

// CORS
app.use(cors());

// server
const server = http.createServer(app);

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
app.use("/search", Search);
//app.use("/notif", Notification);

// PORT
const PORT = process.env.SERVER_PORT;
server.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});

// socket
const io = new Server(server);
socket(io); // def. path: /socket.io
