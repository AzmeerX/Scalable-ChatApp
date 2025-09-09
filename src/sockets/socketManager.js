import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL, // Frontend URL
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`New Client Connected: ${socket.id}`);

        socket.on("ping", () => {
            socket.emit("pong");
        });

        socket.on("disconnect", () => {
            console.log(`Client Disconnected: ${socket.id}`);
        });
    });
    return io;
}

export const getIO = () => {
    if(!io){
        throw new Error("Socket.io Not Initialized");
    }
    else{
        return io;
    }
}