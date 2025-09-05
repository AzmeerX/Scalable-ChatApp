import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, text, media } = req.body;
    const senderId = req.user._id;

    if(!conversationId || (!text && !media)){
        throw new ApiError(400, "Conversation Id and message content required");
    }

    const conversation = await Conversation.findById(conversationId);
    if(!conversation){
        throw new ApiError(404, "Conversation not found");
    }

    const message = await Message.create({
        conversation: conversationId,
        sender: senderId,
        text,
        media
    });

    return res.status(200)
        .json(new ApiResponse(200, message, "Message Sent"));
});

export { sendMessage };