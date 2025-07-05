const express = require('express');
const router = express.Router();
const {
    createPayment,
    getPaymentHistory
} = require('../controller/paymentController');


// Create payment
router.post('/create', createPayment);

// Get payment history
router.get('/history', getPaymentHistory);

module.exports = router;