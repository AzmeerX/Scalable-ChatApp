import { Router } from "express";
import { loginUser, signUpUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/signup").post(signUpUser);

router.route("/login").post(loginUser);

export default router;  