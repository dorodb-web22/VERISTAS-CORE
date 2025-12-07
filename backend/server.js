const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const FdcService = require('./services/fdc-service');
const FtsoService = require('./services/ftso-service');
const BundlerService = require('./services/bundler-service');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const fdcService = new FdcService();
const ftsoService = new FtsoService();
// Initialize Bundler with Paymaster Address (loaded from .env usually)
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS;
const bundlerService = new BundlerService(null, PAYMASTER_ADDRESS);

// 1. Get Reward Quote (Price based)
app.get('/api/quote-reward', async (req, res) => {
    try {
        const { price } = await ftsoService.getFlrPrice();
        // Simple Logic: Reward = 100 / Price
        // or Reward = Price * Multiplier.
        // Let's say Reward is 10 Tokens (fixed) but we log the USD value.
        const rewardAmount = 10;
        res.json({ rewardAmount, flrPrice: price });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Mock Verify and Reward (Demo flow)
// In a real app, User signs UserOp. Here we might simulate or accept signed op.
// Task 3.2 says: "Generate the UserOperation ... Pass to Bundler"
// We'll support receiving a SIGNED UserOp from frontend (best practice)
// OR generating one if we control the key (not decentralized).
// We'll go with: User sends Review + Signed UserOp.

app.post('/api/verify-and-reward', async (req, res) => {
    const { reviewText, userOp } = req.body;
    console.log("Received Request:", { reviewText, userOpSender: userOp?.sender });

    if (!reviewText) return res.status(400).json({ error: "No review text" });

    try {
        // Step 1: FDC Attestation (Trust Layer)
        console.log("--- Step 1: FDC Review Attestation ---");
        const attestation = await fdcService.submitReview(reviewText);
        console.log("Attestation Result:", attestation);

        // Step 2: FTSO Price Check (Just for record/logic)
        console.log("--- Step 2: FTSO Price Check ---");
        const priceData = await ftsoService.getFlrPrice();

        // Step 3: Bundle/Execute
        if (userOp) {
            console.log("--- Step 3: Executing UserOp via Bundler ---");
            // Submit the UserOp provided by the client
            const receipt = await bundlerService.submitUserOp(userOp);

            res.json({
                success: true,
                attestation,
                priceData,
                txHash: receipt.hash
            });
        } else {
            // If no UserOp, just return verification
            res.json({
                success: true,
                message: "Review Verified. No UserOp provided.",
                attestation,
                priceData
            });
        }

    } catch (e) {
        console.error("Error in /verify-and-reward:", e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
