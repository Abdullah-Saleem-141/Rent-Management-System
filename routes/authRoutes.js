const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

// Login page
router.get("/", (req, res) => {
    if (req.session && req.session.loggedIn) {
        return res.redirect("/dashboard");
    }
    res.render('login');
});

// Handle login with SQLite
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const db = req.app.locals.db;
    try {
        // Find admin using SQL
        const admin = await db.get("SELECT * FROM admins WHERE username = ?", [username]);

        if (!admin) {
            req.flash('error_msg', 'Invalid username or password.');
            return res.redirect('/');
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (isMatch) {
            req.session.loggedIn = true;
            req.session.username = admin.username;
            req.session.adminId = admin.id; 

            if (req.body.rememberMe) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; 
            }
            res.redirect("/dashboard");
        } else {
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