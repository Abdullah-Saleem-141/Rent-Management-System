// routes/authRoutes.js

const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const Admin = require('../models/Admin'); // Import the new Admin model

// Login page
router.get("/", (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.session && req.session.loggedIn) {
        return res.redirect("/dashboard");
    }
    res.render('login');
});

// Handle login with secure database check
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // 1. Find an admin with the provided username
        const admin = await Admin.findOne({ username });

        // 2. If no admin is found, or if password does not match, send an error
        if (!admin) {
            req.flash('error_msg', 'Invalid username or password.');
            return res.redirect('/');
        }

        // 3. Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, admin.password);

        if (isMatch) {
            // Passwords match! Create the session.
            req.session.loggedIn = true;
            req.session.username = admin.username; // Optional: store username in session

            if (req.body.rememberMe) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            } else {
                req.session.cookie.expires = false;
            }
            res.redirect("/dashboard");
        } else {
            // Passwords do not match
            req.flash('error_msg', 'Invalid username or password.');
            res.redirect('/');
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: "An error occurred during login." });
    }
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect("/");
    });
});

module.exports = router;