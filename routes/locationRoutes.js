const express = require("express");
const router = express.Router();

function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) return next();
    res.redirect("/");
}

// Display all locations
router.get("/locations", authMiddleware, async (req, res) => {
    const db = req.app.locals.db;
    try {
        const locations = await db.all("SELECT * FROM locations ORDER BY name ASC");
        res.render('locations', { locations, title: 'Manage Locations' });
    } catch (err) {
        console.error(err);
        res.redirect('/dashboard');
    }
});

// Handle adding a new location
router.post("/locations/add", authMiddleware, async (req, res) => {
    const db = req.app.locals.db;
    const { name } = req.body;
    try {
        await db.run("INSERT INTO locations (name) VALUES (?)", [name]);
        req.flash('success_msg', 'New location added!');
        res.redirect('/locations');
    } catch (err) {
        req.flash('error_msg', 'Error adding location or name already exists.');
        res.redirect('/locations');
    }
});

module.exports = router;