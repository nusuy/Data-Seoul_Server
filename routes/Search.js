import express from "express";
import searchController from "../controllers/searchController.js";

const router = express.Router();

router.get("/course/:type", searchController.findCourse);
router.get("/post", searchController.findPost);

export default router;
