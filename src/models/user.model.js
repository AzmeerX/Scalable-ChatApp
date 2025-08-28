import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,   // no duplicates
            index: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true
        },
        profile: {
            type: String // profile picture URL
        },
        description: {
            type: String,
            default: ""
        },
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
); 

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.ACCESS_EXPIRE_TIME
        }
    );
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.REFRESH_EXPIRE_TIME
        }
    );
}

export const User = mongoose.model("User", userSchema);