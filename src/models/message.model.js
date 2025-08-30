import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {
        conversation: {
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
        ]
    },
    {
        timestamps: true
    }
);

export const Message = mongoose.model("Message", messageSchema);