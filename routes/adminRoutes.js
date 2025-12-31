const express = require("express");
const router = express.Router();

// Middleware to ensure the user is logged in
function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return next();
    }
    res.redirect("/");
}
router.use(authMiddleware);

// Display all admin accounts
router.get("/admins", async (req, res) => {
    const db = req.app.locals.db;
    try {
        const admins = await db.all("SELECT id, username FROM admins");
        res.render('admins', {
            admins: admins,
            title: 'Manage Admins'
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching admin accounts.');
        res.redirect('/dashboard');
    }
});

// Handle deleting an admin
router.post("/admins/delete/:id", async (req, res) => {
    const db = req.app.locals.db;
    try {
        if (req.session.adminId == req.params.id) {
            req.flash('error_msg', 'You cannot delete your own account.');
            return res.redirect('/admins');
        }

        const admins = await db.all("SELECT id FROM admins");
        if (admins.length <= 1) {
            req.flash('error_msg', 'You cannot delete the last admin account.');
            return res.redirect('/admins');
        }

        await db.run("DELETE FROM admins WHERE id = ?", [req.params.id]);
        req.flash('success_msg', 'Admin account deleted successfully!');
        res.redirect('/admins');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting admin account.');
        res.redirect('/admins');
    }
});

// Display the page for starting a new month
router.get("/new-month", (req, res) => {
    res.render('new-month', {
        title: 'Start New Billing Cycle'
    });
});

// Handle Option A: Carry Over Balances (New Balance = Current Balance + Fixed Fare)
router.post("/new-month/carry-over", async (req, res) => {
    const db = req.app.locals.db;
    try {
        await db.run("UPDATE users SET balance = balance + fixedFare");
        req.flash('success_msg', 'New month started! Balances have been carried over.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting new month.');
        res.redirect('/new-month');
    }
});

// Handle Option B: Forgive Balances (New Balance = Fixed Fare)
router.post("/new-month/forgive", async (req, res) => {
    const db = req.app.locals.db;
    try {
        await db.run("UPDATE users SET balance = fixedFare");
        req.flash('success_msg', 'New month started with a fresh start! All old balances forgiven.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting new month.');
        res.redirect('/new-month');
    }
});

module.exports = router;