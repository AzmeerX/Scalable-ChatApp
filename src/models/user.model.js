import mongoose from "mongoose";

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
        }
    },
    {
        timestamps: true
    }
);

export const User = mongoose.model("User", userSchema);
