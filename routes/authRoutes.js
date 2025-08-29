const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

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
                if (req.body.rememberMe) {
                    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                } else {
                    req.session.cookie.expires = false;
                }
                res.redirect("/dashboard");
            } else {
                req.flash('error_msg', 'Wrong username or password!');
                res.redirect('/');
            }
        } else {
            req.flash('error_msg', 'Wrong username or password!');
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