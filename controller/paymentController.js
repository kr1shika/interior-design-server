const Payment = require('../model/payment');
const Project = require('../model/project');

// Create Payment (Simulated - No Auth)
const createPayment = async (req, res) => {
    try {
        const { amount, projectId, paymentType } = req.body;

        // Validate input
        const parsedAmount = Math.round(Number(amount));
        if (!parsedAmount || isNaN(parsedAmount) || parsedAmount < 100) {
            return res.status(400).json({
                success: false,
                message: "Amount must be at least Rs. 100"
            });
        }

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Check existing payments for this project to determine the correct payment type
        const existingPayments = await Payment.find({
            project: projectId,
            status: "succeeded"
        });

        console.log('Existing payments for project:', existingPayments.length);

        // Create payment record
        const payment = new Payment({
            project: projectId,
            amount: parsedAmount,
            payment_type: paymentType,
            stripe_payment_intent_id: 'pi_sim_' + Math.random().toString(36).substr(2, 9),
            transaction_id: 'txn_' + Math.random().toString(36).substr(2, 9),
            status: "succeeded",
            payment_date: new Date()
        });

        await payment.save();

        // Update project payment status based on payment type and existing payments
        let newPaymentStatus = project.payment;

        if (paymentType === 'initial' || paymentType === 'half') {
            // First payment (50%)
            newPaymentStatus = 'half-installment';
        } else if (paymentType === 'final') {
            // Final payment (remaining 50%)
            newPaymentStatus = 'completed';
        } else if (paymentType === 'full') {
            // Full payment (100% at once)
            newPaymentStatus = 'completed';
        }

        // Double-check: if this is the second successful payment, mark as completed
        const totalSuccessfulPayments = existingPayments.length + 1; // +1 for the current payment
        if (totalSuccessfulPayments >= 2) {
            newPaymentStatus = 'completed';
        }

        // Update the project
        await Project.findByIdAndUpdate(projectId, {
            payment: newPaymentStatus
        });

        console.log(`Payment processed: ${paymentType}, Project payment status updated to: ${newPaymentStatus}`);

        res.json({
            success: true,
            payment: payment,
            message: 'Payment completed successfully!',
            projectPaymentStatus: newPaymentStatus
        });

    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({
            success: false,
            message: "Payment processing failed",
            error: error.message
        });
    }
};

// Get Payment History (No Auth)
const getPaymentHistory = async (req, res) => {
    try {
        const { projectId } = req.query;

        const filter = {};
        if (projectId) {
            filter.project = projectId;
        }

        const payments = await Payment.find(filter)
            .populate('project', 'title')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            payments
        });

    } catch (error) {
        console.error("Get Payment History Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment history",
            error: error.message
        });
    }
};


module.exports = {
    createPayment,
    getPaymentHistory,

};