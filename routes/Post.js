import express from "express";
import postController from "../controllers/postController.js";
import validateAccessToken from "../middlewares/validateAccessToken.js";

const router = express.Router();

router.get("/", postController.readList);
router.get("/:postId", validateAccessToken, postController.readDetail);

export default router;
