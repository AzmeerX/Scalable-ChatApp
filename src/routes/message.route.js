import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { sendMessage } from "../controllers/message.controller.js";

const router = Router();

router.route("/send-message").post(verifyToken, sendMessage);


export default router;