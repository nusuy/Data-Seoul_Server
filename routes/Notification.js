import express from "express";
import validateAccessToken from "../middlewares/validateAccessToken.js";
import notificationController from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", validateAccessToken, notificationController.readAll);
router.post(
  "/:notifyId",
  validateAccessToken,
  notificationController.setChecked
);

export default router;
