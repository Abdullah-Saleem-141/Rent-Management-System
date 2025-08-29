const mongoose = require('mongoose');
const paginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
        required: true
    },
    fixedFare: { type: Number, required: true },
    isPaid: { type: Boolean, default: false }
});

userSchema.plugin(paginate);
module.exports = mongoose.model('User', userSchema);