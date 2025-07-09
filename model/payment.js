const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "npr"
    },
    payment_type: {
        type: String,
        enum: ["initial", "final"],
        required: true
    },
    payment_method: {
        type: String,
        enum: ["card", "bank_transfer", "cash"],
        default: "card"
    },
    stripe_payment_intent_id: {
        type: String,
        required: false
    },
    stripe_client_secret: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["pending", "processing", "succeeded", "failed", "cancelled"],
        default: "pending"
    },
    transaction_id: {
        type: String,
        required: false
    },
    payment_date: {
        type: Date,
        required: false
    },
    failure_reason: {
        type: String,
        required: false
    },
    refund_amount: {
        type: Number,
        default: 0
    },
    refund_date: {
        type: Date,
        required: false
    },
    metadata: {
        type: Map,
        of: String,
        default: {}
    }
}, { timestamps: true });

// Index for better query performance
paymentSchema.index({ project: 1, user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payment_date: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;