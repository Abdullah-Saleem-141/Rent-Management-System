require("dotenv").config();
const express = require("express");
const session = require("express-session");
const FileStore = require('session-file-store')(session);
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const initDb = require("./database");

const authRoutes = require("./routes/authRoutes");
const mainRoutes = require("./routes/mainRoutes");
const locationRoutes = require("./routes/locationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', './Views');
app.use(express.static('public', { maxAge: '1d' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(compression());

// Session using local files instead of MongoDB
app.use(session({
    store: new FileStore(),
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Initialize SQLite Database and then start server
initDb().then(db => {
    console.log("✅ Local SQLite Database connected");
    app.locals.db = db; // Make DB accessible in all routes

    app.use("/", authRoutes);
    app.use("/", mainRoutes);
    app.use("/", locationRoutes);
    app.use("/", adminRoutes);

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("❌ Database initialization failed:", err);
});