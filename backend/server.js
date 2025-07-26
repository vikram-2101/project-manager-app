const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const http = require("http"); // <-- Import http module
const { Server } = require("socket.io"); // <-- Import Socket.IO Server

const AppError = require("./utils/AppError");
const globalErrorHandler = require("./middleware/errorHandler");
const app = express();
const Notification = require("./models/Notification"); // Required for marking notifications as read through socket.io if needed

// CORS Configuration
console.log("DEBUG: Value of CLIENT_URL from .env:", process.env.CLIENT_URL); // ADD THIS LINE

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["Set-Cookie"],
  })
);
// Import routes
const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const server = http.createServer(app); // Create HTTP server from Express app

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // Allow requests from your frontend URL
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  },
});

// Middleware to attach io to req for use in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- GLOBAL MIDDLEWARES ---
// Security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // max 100 requests per 15 minutes
  windowMs: 15 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter); // Apply to all API routes

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Data sanitization against NoSQL query injection

// app.use(
//   mongoSanitize({
//     replaceWith: "_",
//     onSanitize: ({ req, key }) => {
//       console.warn(`Sanitized ${key} in request`, req.originalUrl);
//     },
//   })
// );

// Data sanitization against XSS
// app.use(xss());

// Prevent parameter pollution
// app.use(
//   hpp({
//     // Specify whitelisted query parameters if you use them, e.g. 'duration'
//     whitelist: [
//       "duration",
//       "ratingsQuantity",
//       "ratingsAverage",
//       "maxGroupSize",
//       "difficulty",
//       "price",
//     ],
//   })
// );

// --- DATABASE CONNECTION ---
const DB = process.env.MONGO_URI;

mongoose
  .connect(DB)
  .then(() => console.log("DB connection successful!"))
  .catch((err) => {
    console.error("DB connection error:", err);
    process.exit(1);
  });

// --- Socket.IO Connection Handling ---
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // When a user logs in, they should join a room with their userId
  // The client will emit 'joinRoom' with their userId
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  // Example: Mark notification as read via socket (optional, but good for real-time updates)
  socket.on("markNotificationAsRead", async (notificationId, userId) => {
    try {
      // Ensure the notification belongs to the user trying to mark it as read
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId: userId, isRead: false },
        { isRead: true },
        { new: true }
      );
      if (notification) {
        // Emit updated notification back to the user
        io.to(userId).emit("notificationUpdated", notification);
        // Maybe also send an updated count of unread notifications
        const unreadCount = await Notification.countDocuments({
          userId: userId,
          isRead: false,
        });
        io.to(userId).emit("unreadNotificationCount", unreadCount);
      }
    } catch (error) {
      console.error("Error marking notification as read via socket:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// --- ROUTES ---

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// Catch-all for undefined routes
app.all(/(.*)/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  // Listen on the HTTP server, not the Express app directly
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO listening on port ${PORT}`);
});
