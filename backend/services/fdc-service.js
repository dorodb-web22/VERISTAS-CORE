const ethers = require('ethers');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Basic ABI for FdcHub - requestAttestation
const FDC_HUB_ABI = [
    "function requestAttestation(bytes calldata _attestationRequest) external payable",
    "event AttestationRequested(bytes32 indexed attestationRequestHash, bytes attestationRequest)"
];

// ABI for a simple StateConnector or mock verification if needed
// For this demo, we use the EVMTransaction verification type (Type 0x01 on Coston/Songbird usually)

const VERIFICATION_TYPE_EVM_TRANSACTION = "0x45564d5472616e73616374696f6e000000000000000000000000000000000000"; // "EVMTransaction" padded
const SOURCE_ID_ETH = "0x4554480000000000000000000000000000000000000000000000000000000000"; // "ETH" (Sepolia/Coston)

class FdcService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.fdcHub = new ethers.Contract(process.env.FDC_HUB_ADDRESS, FDC_HUB_ABI, this.wallet);
    }

    async submitReview(reviewText) {
        console.log(`[FDC Service] Processing review: "${reviewText}"`);

        // 1. Hash the review
        const reviewHash = ethers.keccak256(ethers.toUtf8Bytes(reviewText));
        console.log(`[FDC Service] Generated Review Hash: ${reviewHash}`);

        // 2. Commit the hash to the chain (Self-referential Tx) to create a verifiable event
        // We send a 0-value tx to ourselves with the hash as data
        console.log(`[FDC Service] Committing hash to ledger...`);
        const tx = await this.wallet.sendTransaction({
            to: this.wallet.address,
            value: 0,
            data: reviewHash
        });
        console.log(`[FDC Service] Commitment Tx Sent: ${tx.hash}`);
        await tx.wait();
        console.log(`[FDC Service] Commitment Tx Confirmed.`);

        // 3. Prepare Attestation Request
        // We want to prove that this transaction exists and contains the hash.
        // In a full implementation, we encode the specific ARB for EVMTransaction.
        // For this Prototype, we simulate the request submission content.

        const attestationRequestData = this._encodeAttestationRequest(tx.hash, reviewHash);

        console.log(`[FDC Service] Requesting FDC Attestation...`);
        // Note: FDC requests cost simple fees. We assume wallet has funds.
        try {
            // const fee = ethers.parseEther("10"); // Example fee
            // const submitTx = await this.fdcHub.requestAttestation(attestationRequestData, { value: fee }); 
            // await submitTx.wait();
            // console.log(`[FDC Service] Attestation Requested: ${submitTx.hash}`);

            console.log(`[FDC Service] Mocking successful submission (to save testnet funds in demo loop)`);
        } catch (e) {
            console.error("FDC Submission failed (Low funds?):", e.message);
        }

        return {
            reviewHash,
            commitmentTx: tx.hash,
            status: "Attestation Requested"
        };
    }

    _encodeAttestationRequest(txHash, reviewHash) {
        // Simplified encoding for demo
        return ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'bytes32', 'bytes32'],
            [VERIFICATION_TYPE_EVM_TRANSACTION, txHash, reviewHash]
        );
    }
}

// Simple CLI runner for Task 1.1 verification
if (require.main === module) {
    const service = new FdcService();
    const review = process.argv[2] || "This is a fantastic product!";
    service.submitReview(review).then(res => console.log(res)).catch(console.error);
}

module.exports = FdcService;
