const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { Parser } = require('json2csv');

// Import all models from the new 'models' directory
const User = require('../models/User');
const Payment = require('../models/Payment');
const Location = require('../models/Location');

// ✅ Auth Middleware (moved from the old schema section)
function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) next();
    else res.redirect("/");
}
router.use(authMiddleware);


// ALL YOUR EXISTING ROUTES START HERE (UNCHANGED)

// Dashboard
router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Get all users for the payment form dropdown
        const users = await User.find().populate('location').lean();

        // Calculate stats
        const totalUsers = await User.countDocuments();
        const unpaidUsersCount = await User.countDocuments({ isPaid: false });

        const totalCollectedResult = await Payment.aggregate([
            { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalCollected = totalCollectedResult[0] ? totalCollectedResult[0].total : 0;

        res.render('dashboard', {
            users: users,
            totalUsers: totalUsers,
            totalCollected: totalCollected,
            unpaidUsersCount: unpaidUsersCount,
            title: 'Dashboard' // Also a good idea to pass a title
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error loading dashboard." });
    }
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

        req.flash('success_msg', 'Payment saved successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error saving payment" });
    }
});

// View all users with pagination
// View all users with pagination and sorting
router.get("/users", authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const sortField = req.query.sortField || 'name'; // Default sort by name
        const sortOrder = req.query.sortOrder || 'asc';   // Default sort ascending

        const options = {
            page: page,
            limit: limit,
            lean: true,
            sort: { [sortField]: sortOrder },
            populate: 'location' // Populate location to display its name
        };

        const users = await User.paginate({}, options);
        res.render('users', {
            users: users,
            sortField: sortField,
            sortOrder: sortOrder,
            title: 'All Users'
        });
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

        // Get total collected amount
        const totalCollectedResult = await Payment.aggregate([
            { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalCollected = totalCollectedResult[0] ? totalCollectedResult[0].total : 0;

        // Get unpaid users
        const unpaidUsers = await User.find({ isPaid: false }).populate('location').lean();

        // Calculate the total fare of unpaid users
        const totalUnpaid = unpaidUsers.reduce((sum, user) => sum + user.fixedFare, 0);

        res.render('reports', {
            totalCollected: totalCollected,
            unpaidUsers: unpaidUsers,
            totalUnpaid: totalUnpaid // Pass the new data to the template
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching reports" });
    }
});

// Route to display the Add User form
router.get("/add-user", async (req, res) => {
    try {
        const locations = await Location.find().sort({ name: 'asc' }).lean();
        res.render('add-user', { locations: locations, title: 'Add New Customer' });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading the page.');
        res.redirect('/dashboard');
    }
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
        req.flash('success_msg', 'User added successfully!');
        res.redirect('/users');
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
        req.flash('success_msg', 'User deleted successfully!');
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error deleting user." });
    }
});

// Route to display the Edit User form with pre-filled data
router.get("/edit-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('location'); // Use populate to get location details
        const locations = await Location.find().sort({ name: 'asc' }).lean();
        if (!user) {
            return res.status(404).render('error', { message: "User not found." });
        }
        res.render('edit-user', { user: user, locations: locations, title: 'Edit User' });
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

        req.flash('success_msg', 'User updated successfully!');
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error updating user." });
    }
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
        req.flash('success_msg', 'Payment deleted successfully!');
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error deleting payment." });
    }
});

// Route to download the monthly report as a CSV file
router.get("/download-report", authMiddleware, async (req, res) => {
    try {
        const unpaidUsers = await User.find({ isPaid: false }).populate('location').lean();

        if (unpaidUsers.length === 0) {
            req.flash('error_msg', 'There are no unpaid users to export.');
            return res.redirect('/reports');
        }

        // Manually format the data for the CSV
        const formattedUsers = unpaidUsers.map(user => ({
            name: user.name,
            location: user.location.name,
            fixedFare: user.fixedFare
        }));

        const fields = ['name', 'location', 'fixedFare'];
        const opts = { fields };
        const parser = new Parser(opts);
        const csv = parser.parse(formattedUsers);

        res.header('Content-Type', 'text/csv');
        res.attachment('unpaid-users-report.csv');
        res.send(csv);

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error generating report" });
    }
});

// Route to mark all users as unpaid
router.post("/mark-all-unpaid", authMiddleware, async (req, res) => {
    try {
        // Update all documents in the User collection
        await User.updateMany({}, { $set: { isPaid: false } });

        // Send a success message and redirect
        req.flash('success_msg', 'All users have been marked as unpaid.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating users. Please try again.');
        res.redirect('/dashboard');
    }
});

module.exports = router;