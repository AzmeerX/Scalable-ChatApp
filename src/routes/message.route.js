import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { getMessages, sendMessage } from "../controllers/message.controller.js";

const router = Router();

router.route("/send-message").post(verifyToken, sendMessage);

router.route("/:conversationId").get(verifyToken, getMessages);

export default router;