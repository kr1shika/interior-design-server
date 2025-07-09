const express = require('express');
const router = express.Router();
const {
    createPayment,
    getPaymentHistory,
    
} = require('../controller/paymentController');

// Existing routes
router.post('/create', createPayment);
router.get('/history', getPaymentHistory);


module.exports = router;