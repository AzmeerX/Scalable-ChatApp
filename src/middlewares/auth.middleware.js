import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const verifyToken = asyncHandler(async (req, res, next) => {
    try {
        let token;

        if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        else if (req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1]
        }

        if(!token){
            throw new ApiError(401, "Authorization Denied");
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        throw new ApiError(400, error);
    }
});