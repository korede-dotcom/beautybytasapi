const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const couponSchema = new Schema({
    code: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    status: {
        type: Boolean,
        default: true
    }
});


module.exports = mongoose.model('Coupon', couponSchema);