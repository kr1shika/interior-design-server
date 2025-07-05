const Payment = require('../model/payment');
const Project = require('../model/project');

// Create Payment (Simulated - No Auth)
const createPayment = async (req, res) => {
    try {
        const { amount, projectId, paymentType } = req.body; // Get userId from request body

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

        // Update project payment status
        if (paymentType === 'initial') {
            project.payment = 'half-installment';
        } else if (paymentType === 'final') {
            project.payment = 'completed';
        }
        await project.save();

        res.json({
            success: true,
            payment: payment,
            message: 'Payment completed successfully!'
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



        // const filter = { user: userId };
        // if (projectId) {
        //     filter.project = projectId;
        // }

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
    getPaymentHistory
};