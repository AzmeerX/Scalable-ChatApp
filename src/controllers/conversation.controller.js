import { Conversation } from "../models/conversation.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createOrFetchConversation = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { secondUserId } = req.body;

    if(!secondUserId){
        throw new ApiError(400, "Atleast two users required for chat");
    }

    let conversation = await Conversation.findOne({
        $or: [
            { user1: userId, user2: secondUserId },
            { user1: secondUserId, user2: userId }
        ]
    });

    if(!conversation){
        conversation = await Conversation.create({
            user1: userId,
            user2: secondUserId
        });
    }

    return res.status(200)
        .json(new ApiResponse(200, conversation, "Conversation Fetched"));
});

export { createOrFetchConversation };