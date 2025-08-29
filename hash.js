const bcrypt = require('bcryptjs');
const password = '831'; // Your password from the old code
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) throw err;
    console.log("Your Hashed Password:", hash);
 });