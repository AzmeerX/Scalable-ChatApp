import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectDB } from './DataBase/db.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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