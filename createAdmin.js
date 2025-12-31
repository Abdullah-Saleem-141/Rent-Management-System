const bcrypt = require('bcryptjs');
const initDb = require('./database'); // Imports your new database init function

async function createFirstAdmin() {
    let db;
    try {
        db = await initDb();
        console.log("✅ Connected to SQLite database.");

        const username = "admin"; // Change this to your desired username
        const password = "your_password"; // Change this to your desired password
        
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if admin already exists
        const existingAdmin = await db.get("SELECT * FROM admins WHERE username = ?", [username]);
        
        if (existingAdmin) {
            console.log(`❌ Error: Admin with username "${username}" already exists.`);
        } else {
            // Insert the new admin into the SQLite table
            await db.run("INSERT INTO admins (username, password) VALUES (?, ?)", [username, hashedPassword]);
            console.log(`✅ Admin account "${username}" created successfully!`);
        }
    } catch (err) {
        console.error("❌ An error occurred:", err.message);
    } finally {
        if (db) {
            await db.close();
            console.log("🔌 Database connection closed.");
        }
    }
}

createFirstAdmin();