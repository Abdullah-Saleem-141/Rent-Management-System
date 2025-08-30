const express = require("express");
const router = express.Router();
const Location = require('../models/Location'); // Import the Location model

// Middleware to make sure the user is logged in.
function authMiddleware(req, res, next) {
    if (req.session && req.session.loggedIn) next();
    else res.redirect("/");
}
router.use(authMiddleware);

// (The rest of your location routes remain exactly the same...)

// Display all locations
router.get("/locations", async (req, res) => {
    try {
        const locations = await Location.find().sort({ name: 'asc' }).lean();
        res.render('locations', { locations: locations, title: 'Manage Locations' });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error fetching locations.');
        res.redirect('/dashboard');
    }
});

// Handle adding a new location
router.post("/locations/add", async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            req.flash('error_msg', 'Location name is required.');
            return res.redirect('/locations');
        }
        const newLocation = new Location({ name });
        await newLocation.save();
        req.flash('success_msg', 'New location added successfully!');
        res.redirect('/locations');
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            req.flash('error_msg', 'A location with that name already exists.');
        } else {
            req.flash('error_msg', 'Error adding location.');
        }
        res.redirect('/locations');
    }
});


// Handle deleting a location
router.post("/locations/delete/:id", async (req, res) => {
    try {
        const userCount = await User.countDocuments({ location: req.params.id });
        if (userCount > 0) {
            req.flash('error_msg', 'You cannot delete a location that has users assigned to it.');
            return res.redirect('/locations');
        }

        await Location.findByIdAndDelete(req.params.id);
        req.flash('success_msg', 'Location deleted successfully!');
        res.redirect('/locations');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting location.');
        res.redirect('/locations');
    }
});
module.exports = router;