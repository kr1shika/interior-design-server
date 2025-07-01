const express = require('express');
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const connectDB = require('./config/db');
const projectRouter = require("./route/projectRoute");
const authRouter = require("./route/authRoute");
const chatRouter = require("./route/chatRoomroute");
const userRouter = require("./route/userRoute");
const quizRouter = require("./route/matchRoute");
const path = require("path");

const cors = require("cors");
const app = express();
const PORT = 2005;
require('dotenv').config();

// Connect to MongoDB
connectDB();
dotenv.config({ path: "./config/config.env" });
app.use("/profile_pics", express.static(path.join(__dirname, "profile_pics")));
app.use("/portfolio_uploads", express.static(path.join(__dirname, "portfolio_uploads")));
app.use("/chatUploads", express.static("chatUploads"));

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));
app.use(express.json());

const portfolioRouter = require("./route/portfolioROute");
app.use("/api/portfolio", portfolioRouter);

const notificationRoutes = require("./route/notificationRoute");
app.use("/api/notifications", notificationRoutes);
const passwordChangeRoutes = require("./route/passwordchangeroute");
app.use("/api/password-change", passwordChangeRoutes);


app.use("/api/user", userRouter);

app.use("/api/auth", authRouter);
app.use("/api/project", projectRouter);
app.use("/api/chat", chatRouter);
app.use("/api/quiz", quizRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
