import dotenv from 'dotenv';
import { connectDB } from './DB/db.js';
import http from 'http';
import { initSocket } from './sockets/socketManager.js';
import { app } from './app.js';      

dotenv.config();

const server = http.createServer(app);
initSocket(server); 

const PORT = process.env.PORT;

app.get("/", (req, res) => {
    res.send("Works?")
});

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    })
    .catch((error) => {
        console.log(`Error connecting DB: ${error}`);
    });