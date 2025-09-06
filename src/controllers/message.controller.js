import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

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
        conversationId,
        sender: senderId,
        text,
        media
    });

    return res.status(200)
        .json(new ApiResponse(200, message, "Message Sent"));
});


const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if(!conversationId){
        throw new ApiError(400, "Conversation ID required");
    }

    const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(conversationId) })
            .populate("sender", "username email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
        
    if(!messages){
        throw new ApiError(500, "Something went wrong");
    }

    return res.status(200)
        .json(new ApiResponse(200, messages, "Messages Fetched"));
});


const updateMessageStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if(status !== "sent" || status !== "delivered" || status !== "seen"){
        throw new ApiError(400, "Invalid Status");
    }

    const message = await Message.findById(id);

    if(!message){
        throw new ApiError(404, "Message Not Found");
    }

    if(message.sender.toString() === req.user._id.toString()){
        throw new ApiError(403, "Sender can not update status");
    }

    message.status = status;
    await message.save();

    return res.status(200)
        .json(new ApiResponse(200, message, "Status Updated"));
});


export { sendMessage, getMessages, updateMessageStatus };