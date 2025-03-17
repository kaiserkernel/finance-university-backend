import express, { Application } from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

import { authRouter } from "./routes/user/auth";
import { pendingUserRouter } from "./routes/user/pendingUser";
import { authVerify } from "./middleware/authVerify";
import { announcementRouter } from "./routes/announcement";
import { profileRouter } from "./routes/user/profile";
import { applicationRouter } from "./routes/grantApplication/application";
import { requestProcessRouter } from "./routes/grantApplication/requestProcess";
import { seedRouter } from "./routes/seed";
import initializeServer from "./services/initializationService";
import { reviewerRouter } from "./routes/user/reviewers";
import { chartRouter } from "./routes/chart";

const app: Application = express();
const port:number = Number(process.env.PORT) || 8000;
const corsOptions = {
	origin: [
		"http://172.86.66.70:5173",
		"http://172.86.66.70:8000"
	], 
	credentials: true
	// origin: "*"
};

dotenv.config();

// mongoose connect
const connectDB = async () => {
	try {
	  const result = await mongoose.connect(process.env.DB_URI!);
	  console.log("Connected to DB:", result.connection.name);
	  initializeServer();
	} catch (error) {
	  console.error("DB Connection Error:", error);
	}
};
connectDB();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

// Serve static data
// Serve static files dynamically
const staticPaths = ["images", "reviews", "applications", "additional_doc", "invoice"];
staticPaths.forEach((dir) =>
  app.use(`/${dir}`, express.static(path.resolve(__dirname, "..", "public", dir)))
);

// router
app.use("/api/auth", authRouter);
app.use("/api/seed", seedRouter);
app.use("/api/pending-user", authVerify, pendingUserRouter);
app.use("/api/announcement", (req, res, next) => {
	if (req.method === 'POST' && req.path === "/all") {
		return next();
	}
	authVerify(req, res, next);
}, announcementRouter);
app.use("/api/user", (req, res, next) => {
	if (req.method === 'PUT' && req.path.includes('password')) {
		return next();
	}
	authVerify(req, res, next);
}, profileRouter);
app.use("/api/grant-application", authVerify, [
	applicationRouter,
	requestProcessRouter,
]);
app.use("/api/reviewer", authVerify, reviewerRouter);
app.use("/api/chart", authVerify, chartRouter);

// Start Express Server
const server = app.listen(port,
	"0.0.0.0", 
	() => {
		console.log("=========================================");
		console.log(`Server running at http://localhost:${port}`);
		console.log(`Socket.IO available on the same port`);
		console.log("=========================================");
	}
);
  
// Create Socket.IO Server
const io = new Server(server, {
	cors: corsOptions,
	connectionStateRecovery: {
		maxDisconnectionDuration: 2 * 60 * 1000,
		skipMiddlewares: true,
	},
});

io.engine.generateId = (req) => {
	return uuidv4(); // must be unique across all Socket.IO servers
};

io.on("connection", (socket) => {
	console.log('A user connected: ' ,socket.id);

	socket.on('disconnect', () => {
        console.log(`A user disconnected: ${socket.id}`);
    });
});

export {io}