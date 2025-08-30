import mongoose from "mongoose";

const conversationSchema = mongoose.Schema(
    {
        user1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        user2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);