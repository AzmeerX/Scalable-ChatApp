import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { loginUser, logoutUser, refreshAccessToken, signUpUser } from "../controllers/user.controller.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const router = Router();

router.route("/signup").post(signUpUser);

router.route("/login").post(loginUser);

router.route("/logout").post(logoutUser);

router.route("/me").get(verifyToken, (req, res) => {
    res.json(new ApiResponse(200, req.user, "User data"))
});

router.route("/refresh").post(refreshAccessToken);


export default router;  