process.on('uncaughtException', (error, origin) => {
    console.error(`Caught unhandled exception: ${error}\n` + `Exception origin: ${origin}`);
    process.exit(1);
});

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const userRoutes = require("./routes/userRoutes"); // Import the new routes file
const app = express();
const PORT = process.env.PORT || 3000;

// Remove hardcoded credentials, use only what is in .env file
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URL = process.env.MONGO_URL;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Health check route for Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ✅ Session with MongoDB store
const sessionStore = MongoStore.create({
    mongoUrl: MONGO_URL,
    collectionName: "sessions"
});

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// ✅ Connect to MongoDB and start server
mongoose.connect(MONGO_URL)
    .then(() => {
        console.log("✅ MongoDB connected");
        
        // Use the modular router for all application routes
        app.use("/", userRoutes);

        // Start server only after a successful database connection
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
        });

    })
    .catch(err => {
        console.log("❌ MongoDB connection error:", err);
        process.exit(1);
    });

    // dhhdhhdhd