import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";

const loginUser = asyncHandler( async (req, res) => {
    const  { username, email, password } = req.body;

    if(!username || !email || !password){
        throw new ApiError(400, "Please fill the required fields");
    }

    const user = await User.find({
        $or: [{ email }, { username }]
    });

    if(user === null){
        throw new ApiError(409, "User Not Found");
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if(!checkPassword){
        throw new ApiError(401, "Invalid Password");
    }

    return res.json(
        new ApiResponse(200, user, "Login Successful")
    );
});

export { loginUser };