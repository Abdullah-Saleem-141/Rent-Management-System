process.on('uncaughtException', (error, origin) => {
    console.error(`Caught unhandled exception: ${error}\n` + `Exception origin: ${origin}`);
    process.exit(1);
});

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const app = express();
const PORT = process.env.PORT || 3000;

const PASSWORD = process.env.PASSWORD || "1234";
const SESSION_SECRET = process.env.SESSION_SECRET || "rent-secret-key";
const MONGO_URL = process.env.MONGO_URL;

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

        // ✅ Payment Schema
        const paymentSchema = new mongoose.Schema({
            name: String,
            amount: Number
        });
        const Payment = mongoose.model("Payment", paymentSchema);

        // ✅ Auth Middleware
        function authMiddleware(req, res, next) {
            if (req.session && req.session.loggedIn) next();
            else res.redirect("/");
        }

        // ✅ Routes
        app.get("/", (req, res) => {
            res.send(`
                <h1>Rent Management Login</h1>
                <form action="/login" method="post">
                <label>Password:</label>
                <input type="password" name="password" required />
                <button type="submit">Login</button>
                </form>
            `);
        });

        app.post("/login", (req, res) => {
            const { password } = req.body;
            if (password === PASSWORD) {
                req.session.loggedIn = true;
                res.redirect("/dashboard");
            } else {
                res.send("❌ Wrong password! <br><a href='/'>Go Back</a>");
            }
        });

        app.get("/dashboard", authMiddleware, (req, res) => {
            res.send(`
                <h1>Rent Management System</h1>
                <form action="/save" method="post">
                <label>Name:</label>
                <input type="text" name="name" required /><br><br>
                <label>Amount Paid:</label>
                <input type="number" name="amount" required /><br><br>
                <button type="submit">Save</button>
                </form>
                <br>
                <a href="/payments">View All Payments</a>
                <br><br>
                <a href="/logout">Logout</a>
            `);
        });

        app.post("/save", authMiddleware, async (req, res) => {
            try {
                const { name, amount } = req.body;
                if (!name || !amount) return res.send("❌ Name and amount required");
                const payment = new Payment({ name, amount });
                await payment.save();
                res.send("Payment saved successfully! <br><a href='/dashboard'>Go Back</a>");
            } catch (err) {
                console.error(err);
                res.send("❌ Error saving payment");
            }
        });

        app.get("/payments", authMiddleware, async (req, res) => {
            try {
                const payments = await Payment.find();
                let html = "<h2>All Payments</h2><ul>";
                payments.forEach(p => {
                    html += `<li><strong>${p.name}</strong> paid <strong>${p.amount}</strong> 
                        <a href="/delete/${p._id}" onclick="return confirm('Delete this payment?')">Delete</a>
                    </li>`;
                });
                html += "</ul><br><a href='/dashboard'>Add New Payment</a>";
                res.send(html);
            } catch (err) {
                console.error(err);
                res.send("❌ Error fetching payments");
            }
        });

        app.get("/delete/:id", authMiddleware, async (req, res) => {
            try {
                await Payment.findByIdAndDelete(req.params.id);
            } catch (err) {
                console.error(err);
            }
            res.redirect("/payments");
        });

        app.get("/logout", (req, res) => {
            req.session.destroy(err => {
                if (err) console.error(err);
                res.redirect("/");
            });
        });

        // Start server only after a successful database connection
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
        });

    })
    .catch(err => {
        console.log("❌ MongoDB connection error:", err);
        // Exit the process with an error code if the database connection fails
        process.exit(1);
    });