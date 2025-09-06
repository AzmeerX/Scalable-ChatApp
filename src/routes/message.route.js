import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { getMessages, markAllSeen, sendMessage, updateMessageStatus } from "../controllers/message.controller.js";

const router = Router();

router.route("/send-message").post(verifyToken, sendMessage);

router.route("/:conversationId").get(verifyToken, getMessages);

router.route("/:conversationId/status").patch(verifyToken, updateMessageStatus);

router.route("/:conversationId/seen").patch(verifyToken, markAllSeen);


export default router;