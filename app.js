const express = require('express');
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const connectDB = require('./config/db');
const userRouter = require("./route/userRoute");
const authRouter = require("./route/authRoute");
const cors = require("cors");
const app = express();
const PORT = 2005;
require('dotenv').config();

// Connect to MongoDB
connectDB();
dotenv.config({ path: "./config/config.env" });

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRouter);


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

