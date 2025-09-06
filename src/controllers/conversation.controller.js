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
    })
        .populate("lastMessage", "sender text createdAt")
        .populate("user1 user2", "username email")

    if(!conversation){
        conversation = await Conversation.create({
            user1: userId,
            user2: secondUserId
        });
    }

    conversation = await Conversation.findById(conversation._id)
        .populate("lastMessage", "sender text createdAt")
        .populate("user1 user2", "username email")
        

    return res.status(200)
        .json(new ApiResponse(200, conversation, "Conversation Fetched"));
});


const findAllConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if(!userId){
        throw new ApiError(400, "User ID required");
    }

    const conversations = await Conversation.find({
        $or: [
            { user1: userId}, { user2: userId }
        ]
    })
        .populate("lastMessage", "sender text createdAt")
        .populate("user1 user2", "username email")
        .sort({ updatedAt: -1 });

    if(!conversations.length){
        throw new ApiError(400, "Start a new conversation to chat");
    }

    return res.status(200)
        .json(new ApiResponse(200, conversations, "All chats fetched"));
});

export { createOrFetchConversation, findAllConversations };