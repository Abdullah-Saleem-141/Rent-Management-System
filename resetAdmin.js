const bcrypt = require('bcryptjs');
const initDb = require('./database');

async function resetAdmin() {
    let db;
    try {
        db = await initDb();
        
        // 1. Choose your new credentials here
        const newUsername = "admin"; 
        const newPassword = "123"; // Set this to whatever you want

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 2. Remove old admin to avoid "Already Exists" errors
        await db.run("DELETE FROM admins WHERE username = ?", [newUsername]);

        // 3. Insert the fresh account
        await db.run("INSERT INTO admins (username, password) VALUES (?, ?)", [newUsername, hashedPassword]);

        console.log("-----------------------------------------");
        console.log("✅ SUCCESS: Admin credentials reset!");
        console.log(`👤 Username: ${newUsername}`);
        console.log(`🔑 Password: ${newPassword}`);
        console.log("-----------------------------------------");
        
    } catch (err) {
        console.error("❌ Error resetting admin:", err.message);
    } finally {
        if (db) await db.close();
    }
}

resetAdmin();