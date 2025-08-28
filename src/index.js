import dotenv from 'dotenv';
import { connectDB } from './DB/db.js';

dotenv.config();

import { app } from './app.js';      

const PORT = process.env.PORT;

app.get("/", (req, res) => {
    res.send("Works?")
});

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on ${PORT}`);
        });
    })
    .catch((error) => {
        console.log(`Error connecting DB: ${error}`);
    });