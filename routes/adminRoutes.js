const express = require("express");
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User'); // We need the User model for the new month logic

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

// Handle adding a new admin
router.post("/admins/add", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            req.flash('error_msg', 'Username and password are required.');
            return res.redirect('/admins');
        }

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            req.flash('error_msg', 'An admin with that username already exists.');
            return res.redirect('/admins');
        }

        const newAdmin = new Admin({ username, password });
        await newAdmin.save();
        req.flash('success_msg', 'New admin added successfully!');
        res.redirect('/admins');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding new admin.');
        res.redirect('/admins');
    }
});

// Handle deleting an admin
router.post("/admins/delete/:id", async (req, res) => {
    try {
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
    res.render('new-month', { title: 'Start New Billing Cycle' });
});

// Handle Option A: Carry Over Balances
router.post("/new-month/carry-over", async (req, res) => {
    try {
        await User.updateMany({}, [
            { $set: { balance: { $add: ["$balance", "$fixedFare"] } } }
        ]);
        req.flash('success_msg', 'New month started! Balances have been carried over.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting new month.');
        res.redirect('/new-month');
    }
});

// Handle Option B: Forgive Balances
router.post("/new-month/forgive", async (req, res) => {
    try {
        await User.updateMany({}, [
            { $set: { balance: "$fixedFare" } }
        ]);
        req.flash('success_msg', 'New month started with a fresh start! All old balances have been forgiven.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error starting new month.');
        res.redirect('/new-month');
    }
});

module.exports = router;