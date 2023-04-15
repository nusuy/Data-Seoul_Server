import express from "express";
import dotenv from "dotenv";
import db from "./models/index.js";

// env
dotenv.config();

// express
const app = express();
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

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
