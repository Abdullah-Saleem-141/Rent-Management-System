const express = require("express");
const router = express.Router();
const { Parser } = require('json2csv');

// Auth Middleware
function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) next();
    else res.redirect("/");
}

// Dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const locations = await db.all("SELECT * FROM locations ORDER BY name ASC");
        const users = await db.all("SELECT * FROM users ORDER BY name ASC");
        
        // Get payments for the current month
        const payments = await db.all(`
            SELECT * FROM payments 
            WHERE strftime('%m', date) = strftime('%m', 'now') 
            AND strftime('%Y', date) = strftime('%Y', 'now')
        `);

        // Map users to locations for the dashboard view
        const finalLocations = locations.map(loc => {
            return {
                ...loc,
                users: users.filter(u => u.location_id === loc.id)
            };
        });

        const totalUsers = users.length;
        const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
        const unpaidUsersCount = users.filter(u => u.balance > 0).length;

        res.render('dashboard', {
            locations: finalLocations,
            totalUsers,
            totalCollected,
            unpaidUsersCount,
            title: 'Dashboard'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error loading dashboard." });
    }
});

// Save a new payment
router.post("/save-payment", authMiddleware, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const { userId, amount } = req.body;
        const paymentAmount = Number(amount);

        await db.run("INSERT INTO payments (user_id, amount) VALUES (?, ?)", [userId, paymentAmount]);
        await db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [paymentAmount, userId]);

        req.flash('success_msg', 'Payment saved successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error saving payment" });
    }
});

// Add User
router.post("/add-user", authMiddleware, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const { name, location, fixedFare } = req.body;
        await db.run(
            "INSERT INTO users (name, location_id, fixedFare, balance) VALUES (?, ?, ?, ?)",
            [name, location, fixedFare, fixedFare]
        );
        req.flash('success_msg', 'User added successfully!');
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error adding user." });
    }
});

// View Users list
router.get("/users", authMiddleware, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const locations = await db.all("SELECT * FROM locations ORDER BY name ASC");
        res.render('users', { locations, title: 'Users by Location' });
    } catch (err) {
        res.status(500).render('error', { message: "Error fetching locations" });
    }
});

module.exports = router;