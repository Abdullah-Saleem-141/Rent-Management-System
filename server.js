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

        // ✅ User Schema (new)
        const userSchema = new mongoose.Schema({
            name: String,
            location: String,
            fixedFare: Number,
            isPaid: Boolean
        });
        const User = mongoose.model("User", userSchema);

        // ✅ Payment Schema
        const paymentSchema = new mongoose.Schema({
            userId: mongoose.Schema.Types.ObjectId,
            amount: Number,
            date: { type: Date, default: Date.now } // Automatically set date
        });
        const Payment = mongoose.model("Payment", paymentSchema);

        // ✅ Auth Middleware
        function authMiddleware(req, res, next) {
            if (req.session && req.session.loggedIn) next();
            else res.redirect("/");
        }

        // ✅ Routes

        // Login page
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

        // Handle login
        app.post("/login", (req, res) => {
            const { password } = req.body;
            if (password === PASSWORD) {
                req.session.loggedIn = true;
                res.redirect("/dashboard");
            } else {
                res.send("❌ Wrong password! <br><a href='/'>Go Back</a>");
            }
        });

        // Dashboard
        app.get("/dashboard", authMiddleware, async (req, res) => {
            const users = await User.find();
            let userOptions = users.map(user => `<option value="${user._id}">${user.name} - ${user.location}</option>`).join('');
            res.send(`
                <h1>Rent Management System</h1>
                <h2>Record a Payment</h2>
                <form action="/save-payment" method="post">
                    <label for="userSelect">User:</label>
                    <select name="userId" id="userSelect" required>
                        ${userOptions}
                    </select><br><br>
                    <label>Amount Paid:</label>
                    <input type="number" name="amount" required /><br><br>
                    <button type="submit">Save Payment</button>
                </form>
                <br>
                <a href="/users">View All Users</a>
                <br><br>
                <a href="/reports">View Monthly Reports</a>
                <br><br>
                <a href="/logout">Logout</a>
            `);
        });

        // Save a new payment (new route)
        app.post("/save-payment", authMiddleware, async (req, res) => {
            try {
                const { userId, amount } = req.body;
                if (!userId || !amount) return res.send("❌ User and amount required");

                const payment = new Payment({ userId, amount });
                await payment.save();

                await User.findByIdAndUpdate(userId, { isPaid: true });

                res.send("Payment saved successfully! <br><a href='/dashboard'>Go Back</a>");
            } catch (err) {
                console.error(err);
                res.send("❌ Error saving payment");
            }
        });

        // View all users (new route)
        app.get("/users", authMiddleware, async (req, res) => {
            try {
                const users = await User.find();
                let html = "<h2>All Users</h2><ul>";
                users.forEach(user => {
                    html += `<li><strong>${user.name}</strong> (${user.location}) - Fixed Fare: <strong>${user.fixedFare}</strong>`;
                    html += user.isPaid ? ' - <span style="color: green;">Paid</span>' : ' - <span style="color: red;">Unpaid</span>';
                    html += `</li>`;
                });
                html += "</ul><br><a href='/dashboard'>Record New Payment</a>";
                res.send(html);
            } catch (err) {
                console.error(err);
                res.send("❌ Error fetching users");
            }
        });

        // Monthly reports (new route)
        app.get("/reports", authMiddleware, async (req, res) => {
            try {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                const totalCollected = await Payment.aggregate([
                    { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);

                const unpaidUsers = await User.find({ isPaid: false });

                let html = "<h2>Monthly Report</h2>";
                html += `<h3>Total Collected this Month: ${totalCollected[0] ? totalCollected[0].total : 0}</h3>`;
                html += `<h3>Users Remaining to Pay:</h3>`;
                html += "<ul>";
                unpaidUsers.forEach(user => {
                    html += `<li>${user.name} (${user.location})</li>`;
                });
                html += "</ul><br><a href='/dashboard'>Go Back to Dashboard</a>";
                res.send(html);

            } catch (err) {
                console.error(err);
                res.send("❌ Error fetching reports");
            }
        });

        // Logout
        app.get("/logout", (req, res) => {
            req.session.destroy(err => {
                if (err) console.error(err);
                res.redirect("/");
            });
        });

        // TEMPORARY: Route to add initial users
app.get("/add-users", authMiddleware, async (req, res) => {
  try {
    const usersToAdd = [
      { name: "User One", location: "Location A", fixedFare: 100, isPaid: false },
      { name: "User Two", location: "Location B", fixedFare: 150, isPaid: false },
      { name: "User Three", location: "Location C", fixedFare: 200, isPaid: false }
    ];
    await User.insertMany(usersToAdd);
    res.send("Initial users added successfully!");
  } catch (err) {
    console.error(err);
    res.send("Error adding users");
  }
});
        // Start server only after a successful database connection
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
        });

    })
    .catch(err => {
        console.log("❌ MongoDB connection error:", err);
        process.exit(1);
    });