// routes/adminRoutes.js

const express = require("express");
const router = express.Router();
const Admin = require('../models/Admin');

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
    try {
        const admins = await Admin.find({}).lean();
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

// routes/adminRoutes.js

// ... (existing code and the router.get('/admins', ...) route) ...

// ADD THIS BLOCK TO HANDLE ADDING A NEW ADMIN
router.post("/admins/add", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            req.flash('error_msg', 'Username and password are required.');
            return res.redirect('/admins');
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            req.flash('error_msg', 'An admin with that username already exists.');
            return res.redirect('/admins');
        }

        const newAdmin = new Admin({ username, password });
        await newAdmin.save(); // The password will be auto-hashed here by our model
        req.flash('success_msg', 'New admin added successfully!');
        res.redirect('/admins');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding new admin.');
        res.redirect('/admins');
    }
});

// ADD THIS BLOCK TO HANDLE DELETING AN ADMIN
router.post("/admins/delete/:id", async (req, res) => {
    try {
        // Prevent user from deleting the last admin account
        const adminCount = await Admin.countDocuments();
        if (adminCount <= 1) {
            req.flash('error_msg', 'You cannot delete the last admin account.');
            return res.redirect('/admins');
        }

        await Admin.findByIdAndDelete(req.params.id);
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
    // routes/adminRoutes.js

// ADD THIS ROUTE FOR OPTION A: CARRY OVER BALANCES
router.post("/new-month/carry-over", async (req, res) => {
    try {
        const users = await User.find({});
        for (const user of users) {
            // New balance is the old balance PLUS the fixed fare
            user.balance += user.fixedFare;
            await user.save();
        }
        req.flash('success_msg', 'New month started! Balances have been carried over.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting new month.');
        res.redirect('/new-month');
    }
});

// ADD THIS ROUTE FOR OPTION B: FORGIVE BALANCES
router.post("/new-month/forgive", async (req, res) => {
    try {
        const users = await User.find({});
        for (const user of users) {
            // New balance is set exactly to the fixed fare
            user.balance = user.fixedFare;
            await user.save();
        }
        req.flash('success_msg', 'New month started with a fresh start! All old balances have been forgiven.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting new month.');
        res.redirect('/new-month');
    }
});
    res.render('new-month', { title: 'Start New Billing Cycle' });
});
// More routes will be added here in the next steps...

module.exports = router;