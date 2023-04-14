import express from "express";
import dotenv from "dotenv";

// env
dotenv.config();

// express
const app = express();
const PORT = process.env.SERVER_PORT;

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});
