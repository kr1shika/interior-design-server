const express = require('express');
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });
const connectDB = require('./config/db');
const projectRouter = require("./route/projectRoute");
const authRouter = require("./route/authRoute");
const chatRouter = require("./route/chatRoomroute");
const userRouter = require("./route/userRoute");
const quizRouter = require("./route/matchRoute");
const paymentRouter = require("./route/paymentRoute"); // Add this line
const path = require("path");

const cors = require("cors");
const app = express();
const PORT = 2005;
require('dotenv').config();

// Connect to MongoDB
connectDB();
dotenv.config({ path: "./config/config.env" });

// Static file serving
app.use("/profile_pics", express.static(path.join(__dirname, "profile_pics")));
app.use("/portfolio_uploads", express.static(path.join(__dirname, "portfolio_uploads")));
app.use("/chatUploads", express.static("chatUploads"));

// CORS configuration
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

// Webhook endpoint needs raw body, so it should be before express.json()
app.use('/api/payment/webhook', express.raw({type: 'application/json'}));

// JSON parsing for all other routes
app.use(express.json());

// Routes
const portfolioRouter = require("./route/portfolioROute");
app.use("/api/portfolio", portfolioRouter);

const notificationRoutes = require("./route/notificationRoute");
app.use("/api/notifications", notificationRoutes);

const passwordChangeRoutes = require("./route/passwordchangeroute");
app.use("/api/password-change", passwordChangeRoutes);

const reviewRoute = require("./route/reviewRoute");
app.use("/api/review", reviewRoute);
app.use("/api/payment", require("./route/paymentRoute")); // Ensure this is after the webhook route
app.use("/api/user", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/project", projectRouter);
app.use("/api/chat", chatRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/payment", paymentRouter); // Add this line

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});