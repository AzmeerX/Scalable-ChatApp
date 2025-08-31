import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { createOrFetchConversation } from "../controllers/conversation.controller.js";

const router = Router();

router.route("/create-or-find").post(verifyToken, createOrFetchConversation);

export default router;