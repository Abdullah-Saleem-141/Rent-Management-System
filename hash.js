const bcrypt = require('bcryptjs');

const myNewPassword = "0831"; // Replace with your desired new password
const saltRounds = 10;

bcrypt.hash(myNewPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error(err);
    } else {
        console.log("New Hashed Password:");
        console.log(hash);
    }
});