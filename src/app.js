import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import userRouter from "./routes/user.route.js";

app.use("/api/v1/users", userRouter);  

import conversationRouter from "./routes/conversation.route.js";

app.use("/api/v1/conversations", conversationRouter);

export { app };