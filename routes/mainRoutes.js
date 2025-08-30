const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { Parser } = require('json2csv');

// Import all models
const User = require('../models/User');
const Payment = require('../models/Payment');
const Location = require('../models/Location');

// Auth Middleware
function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) next();
    else res.redirect("/");
}
router.use(authMiddleware);


// Dashboard
// In routes/mainRoutes.js

router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        const [locations, users, payments] = await Promise.all([
            Location.find().sort({ name: 'asc' }).lean(),
            User.find().sort({ name: 'asc' }).lean(),
            Payment.find({ date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }).lean()
        ]);

        const locationsMap = new Map(locations.map(loc => [loc._id.toString(), { ...loc, users: [] }]));

        users.forEach(user => {
            const userLocationId = user.location.toString();
            if (locationsMap.has(userLocationId)) {
                locationsMap.get(userLocationId).users.push(user);
            }
        });

        locationsMap.forEach(location => {
            location.users.sort((a, b) => a.balance - b.balance);
        });

        const finalLocations = Array.from(locationsMap.values());

        const totalUsers = users.length;
        const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const unpaidUsersCount = users.filter(user => user.balance > 0).length;

        res.render('dashboard', {
            locations: finalLocations,
            totalUsers: totalUsers,
            totalCollected: totalCollected,
            unpaidUsersCount: unpaidUsersCount,
            title: 'Dashboard'
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
        const paymentAmount = Number(amount);
        if (!userId || !paymentAmount) {
            return res.status(400).render('error', { message: "User and amount required" });
        }

        const payment = new Payment({ userId, amount: paymentAmount });
        await payment.save();
        await User.findByIdAndUpdate(userId, { $inc: { balance: -paymentAmount } });

        req.flash('success_msg', 'Payment saved successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error saving payment" });
    }
});

// Display list of locations
router.get("/users", authMiddleware, async (req, res) => {
    try {
        const locations = await Location.find().sort({ name: 'asc' }).lean();
        res.render('users', {
            locations: locations,
            title: 'Users by Location'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching locations" });
    }
});

// Display users for a specific location
// In routes/mainRoutes.js

// Display users for a specific location
router.get("/users/location/:id", authMiddleware, async (req, res) => {
    try {
        const locationId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const searchQuery = req.query.search || '';

        const location = await Location.findById(locationId).lean();
        if (!location) {
            req.flash('error_msg', 'Location not found.');
            return res.redirect('/users');
        }

        // Build the query object
        const query = {
            location: locationId
        };
        if (searchQuery) {
            query.name = new RegExp(searchQuery, 'i'); // Case-insensitive search
        }

        const options = {
            page: page,
            limit: limit,
            lean: true,
            sort: { name: 'asc' },
            populate: 'location'
        };

        const users = await User.paginate(query, options);

        res.render('users-by-location', {
            users: users,
            location: location,
            title: `Users in ${location.name}`,
            search: searchQuery // Pass search query back to the view
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching users for this location" });
    }
});

// Display the Add User form
router.get("/add-user", authMiddleware, async (req, res) => {
    try {
        const locations = await Location.find().sort({ name: 'asc' }).lean();
        res.render('add-user', { locations: locations, title: 'Add New Customer' });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading the page.');
        res.redirect('/dashboard');
    }
});

// Handle saving a new user
router.post("/add-user", authMiddleware, async (req, res) => {
    try {
        const { name, location, fixedFare } = req.body;
        if (!name || !location || !fixedFare) {
            return res.status(400).render('error', { message: "All fields are required." });
        }
        const newUser = new User({ name, location, fixedFare, balance: fixedFare });
        await newUser.save();
        req.flash('success_msg', 'User added successfully!');
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error adding user." });
    }
});

// Handle deleting a user
router.post("/delete-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        req.flash('success_msg', 'User deleted successfully!');
        res.redirect('back');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error deleting user." });
    }
});

// Display the Edit User form
router.get("/edit-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).populate('location');
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

// Handle updating a user
router.post("/edit-user/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, fixedFare, balance } = req.body;
        await User.findByIdAndUpdate(id, { name, location, fixedFare, balance });
        req.flash('success_msg', 'User updated successfully!');
        res.redirect('/users');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error updating user." });
    }
});

// Display payment history for a user
router.get("/payments/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        const payments = await Payment.find({ userId: id }).sort({ date: -1 });
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        if (!user) {
            return res.status(404).render('error', { message: "User not found." });
        }
        res.render('payments', { user, payments, totalPaid });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching payment history." });
    }
});

// Handle deleting a payment
router.post("/delete-payment/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findById(id);

        if (payment) {
            await User.findByIdAndUpdate(payment.userId, { $inc: { balance: payment.amount } });
            await Payment.findByIdAndDelete(id);
            req.flash('success_msg', 'Payment deleted and user balance updated!');
        } else {
            req.flash('error_msg', 'Payment not found.');
        }
        
        res.redirect('back'); 
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error deleting payment." });
    }
});

// Reports Page
router.get("/reports", authMiddleware, async (req, res) => {
    try {
        const monthlyIncome = await Payment.aggregate([
            {
                $group: {
                    _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                    totalAmount: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const chartLabels = monthlyIncome.map(item => `${monthNames[item._id.month - 1]} ${item._id.year}`).reverse();
        const chartData = monthlyIncome.map(item => item.totalAmount).reverse();

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const totalCollectedResult = await Payment.aggregate([
            { $match: { date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalCollectedThisMonth = totalCollectedResult[0] ? totalCollectedResult[0].total : 0;

        const unpaidUsers = await User.find({ balance: { $gt: 0 } }).populate('location').lean();
        const totalOutstanding = unpaidUsers.reduce((sum, user) => sum + user.balance, 0);

        res.render('reports', {
            title: 'Financial Reports',
            chartLabels: JSON.stringify(chartLabels),
            chartData: JSON.stringify(chartData),
            totalCollectedThisMonth: totalCollectedThisMonth,
            totalOutstanding: totalOutstanding,
            unpaidUsers: unpaidUsers
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error fetching reports" });
    }
});

// Download unpaid users report
router.get("/download-report", authMiddleware, async (req, res) => {
    try {
        const unpaidUsers = await User.find({ balance: { $gt: 0 } }).populate('location').lean();

        if (unpaidUsers.length === 0) {
            req.flash('error_msg', 'There are no unpaid users to export.');
            return res.redirect('/reports');
        }

        const formattedUsers = unpaidUsers.map(user => ({
            Name: user.name,
            Location: user.location ? user.location.name : 'N/A',
            Balance: user.balance
        }));

        const fields = ['Name', 'Location', 'Balance'];
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

// Download all users report
router.get("/download-all-users", authMiddleware, async (req, res) => {
    try {
        const users = await User.find({}).populate('location').sort({ 'location.name': 1, name: 1 }).lean();
        if (users.length === 0) {
            req.flash('error_msg', 'There are no users to export.');
            return res.redirect('/users');
        }
        const formattedUsers = users.map(user => ({
            Name: user.name,
            Location: user.location ? user.location.name : 'N/A',
            "Fixed Fare": user.fixedFare,
            Balance: user.balance
        }));
        const fields = ['Name', 'Location', 'Fixed Fare', 'Balance'];
        const opts = { fields };
        const parser = new Parser(opts);
        const csv = parser.parse(formattedUsers);
        res.header('Content-Type', 'text/csv');
        res.attachment('all-users-report.csv');
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "Error generating user report" });
    }
});

module.exports = router;