import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            trim: true
        },
        media: [
            {
                url: String,
                type: String
            }
        ],
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent"
        }
    },
    {
        timestamps: true
    }
);

export const Message = mongoose.model("Message", messageSchema);