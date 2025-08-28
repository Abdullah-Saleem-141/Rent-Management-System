const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const router = express.Router();

// ✅ User Schema
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
    date: { type: Date, default: Date.now }
});
const Payment = mongoose.model("Payment", paymentSchema);

// ✅ Auth Middleware
function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) next();
    else res.redirect("/");
}

// ✅ Routes

// Login page
router.get("/", (req, res) => {
    res.render('login');
});

// Handle login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === "saleem cables") {
            const isMatch = await bcrypt.compare(password, process.env.PASSWORD);
            if (isMatch) {
                req.session.loggedIn = true;
                res.redirect("/dashboard");
            } else {
                res.render('error', { message: "Wrong username or password!" });
            }
        } else {
            res.render('error', { message: "Wrong username or password!" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "An error occurred during login." });
    }
});

// Dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
    const users = await User.find();
    res.render('dashboard', { users: users });
});

// Save a new payment
router.post("/save-payment", authMiddleware, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        if (!userId || !amount) {
            return res.status(400).render('error', { message: "User and amount required" });
        }

        const payment = new Payment({ userId, amount });
        await payment.save();
        await User.findByIdAndUpdate(userId, { isPaid: true });

        res.send("Payment saved successfully! <br><a href='/dashboard'>Go Back</a>");
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error saving payment" });
    }
});

// View all users
router.get("/users", authMiddleware, async (req, res) => {
    try {
        const users = await User.find();
        res.render('users', { users: users });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching users" });
    }
});

// Monthly reports
router.get("/reports", authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const totalCollected = await Payment.aggregate([
            { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const unpaidUsers = await User.find({ isPaid: false });

        res.render('reports', {
            totalCollected: totalCollected[0] ? totalCollected[0].total : 0,
            unpaidUsers: unpaidUsers
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching reports" });
    }
});

// Route to display the Add User form
router.get("/add-user", authMiddleware, (req, res) => {
    res.render('add-user');
});

// Route to handle form submission and save a new user
router.post("/add-user", authMiddleware, async (req, res) => {
    try {
        const { name, location, fixedFare } = req.body;
        if (!name || !location || !fixedFare) {
            return res.status(400).render('error', { message: "All fields are required." });
        }
        const newUser = new User({ name, location, fixedFare, isPaid: false });
        await newUser.save();
        res.send("User added successfully! <br><a href='/dashboard'>Go Back to Dashboard</a>");
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error adding user." });
    }
});

// Route to delete a user
router.post("/delete-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.send("User deleted successfully! <br><a href='/users'>Go Back to Users List</a>");
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error deleting user." });
    }
});

// Route to display the Edit User form with pre-filled data
router.get("/edit-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).render('error', { message: "User not found." });
        }
        res.render('edit-user', { user: user });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching user data." });
    }
});

// Route to handle form submission and update the user in the database
router.post("/edit-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, fixedFare, isPaid } = req.body;
        
        await User.findByIdAndUpdate(id, {
            name,
            location,
            fixedFare,
            isPaid: !!isPaid // Convert 'on' or undefined to a boolean
        });

        res.send("User updated successfully! <br><a href='/users'>Go Back to Users List</a>");
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error updating user." });
    }
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect("/");
    });
});

// Route to view payment history for a specific user
router.get("/payments/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        const payments = await Payment.find({ userId: id }).sort({ date: -1 });
        
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

        if (!user) {
            return res.status(404).render('error', { message: "User not found." });
        }
        
        res.render('payments', {
            user: user,
            payments: payments,
            totalPaid: totalPaid
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching payment history." });
    }
});

// Route to delete a payment
router.post("/delete-payment/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await Payment.findByIdAndDelete(id);
        res.send("Payment deleted successfully! <br><a href='/users'>Go Back to Users List</a>");
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error deleting payment." });
    }
});

module.exports = router;