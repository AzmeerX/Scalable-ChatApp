import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

const loginUser = asyncHandler(async (req, res) => {
    const  { username, email, password } = req.body;

    if(!username || !email || !password){
        throw new ApiError(400, "Please fill the required fields");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    });

    if(!user){
        throw new ApiError(409, "User Not Found");
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if(!checkPassword){
        throw new ApiError(401, "Invalid Password");
    }

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Something went wrong");
    }

    const accessToken = createdUser.generateAccessToken();
    const refreshToken = createdUser.generateRefreshToken();

    return res.status(200)
        .cookie("accessToken", accessToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 })
        .cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 10 * 24 * 60 * 60 * 1000 })
        .json(new ApiResponse(200, { user: createdUser, accessToken, refreshToken }, "Login Successful!"));
});


const logoutUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .cookie("accessToken", "", { httpOnly: true, expires: new Date(0) })
        .cookie("refreshToken", "", { httpOnly: true, expires: new Date(0) })
        .json(new ApiResponse(200, null, "Logged Out"));
});


const signUpUser = asyncHandler(async (req, res) => {
    const { username, email, password, profile, description } = req.body;

    if(!username || !email || !password){
        throw new ApiError(400, "Please fill all fields");
    }

    const userExists = await User.findOne({
        $or: [{ username }, { email }]
    });

    if(userExists){
        throw new ApiError(409, "Username or Email Already Exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        profile: profile ? profile : "",
        description
    });

    if(!user){
        throw new ApiError(500, "Something went wrong");
    }
    
    const createdUser = await User.findById(user._id).select("-password -refreshToken") ;
    
    if(!createdUser){
        throw new ApiError(500, "Something went wrong");
    }

    return res.status(
        new ApiResponse(200, createdUser, "Sign up Successful")
    );
});

export { loginUser, signUpUser };