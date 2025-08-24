import mongoose from "mongoose";

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            index: true,
            unique: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        profile: {
            type: String, //url
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