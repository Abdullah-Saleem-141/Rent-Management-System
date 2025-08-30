// createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('./models/Admin');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper function to make readline work with async/await
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    console.error("❌ Missing MONGO_URL in your .env file!");
    process.exit(1);
}

const createAdminAccount = async () => {
    let connection; // To hold the mongoose connection
    try {
        connection = await mongoose.connect(MONGO_URL);
        console.log("✅ MongoDB connected for script.");

        // This will now properly wait for your input
        const username = await question('Enter a username for the new admin: ');
        const password = await question('Enter a password for the new admin: ');

        if (!username.trim() || !password.trim()) {
            console.error("❌ Username and password cannot be empty.");
            return; // Exit the function
        }

        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            console.error(`❌ An admin with the username "${username}" already exists.`);
            return; // Exit the function
        }

        const newAdmin = new Admin({ username, password });
        await newAdmin.save();
        console.log(`✅ Admin user "${username}" created successfully!`);

    } catch (err) {
        console.error("❌ An error occurred:", err.message);
    } finally {
        // This ensures we always close the connection and the script
        if (connection) {
            await mongoose.disconnect();
            console.log("🔌 MongoDB connection closed.");
        }
        rl.close();
    }
};

createAdminAccount();