import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { createOrFetchConversation, findAllConversations } from "../controllers/conversation.controller.js";

const router = Router();

router.route("/create-or-find").post(verifyToken, createOrFetchConversation);

router.route("/get-conversations").get(verifyToken, findAllConversations);


export default router;