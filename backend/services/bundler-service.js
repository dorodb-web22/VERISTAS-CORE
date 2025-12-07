const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

// Standard EntryPoint 0.6.0 Address (Common across testnets)
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

// Minimal EntryPoint ABI for handleOps
const ENTRY_POINT_ABI = [
    "function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature)[] ops, address beneficiary) external payable",
    "function getNonce(address sender, uint192 key) view returns (uint256 nonce)"
];

class BundlerService {
    constructor(signingKey, paymasterAddress) {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider); // The 'Bundler' is the business wallet for now
        this.entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, this.signer);
        this.paymasterAddress = paymasterAddress;
    }

    async getNonce(accountAddress) {
        return await this.entryPoint.getNonce(accountAddress, 0);
    }

    async submitUserOp(userOp) {
        console.log(`[Bundler] Submitting UserOp for ${userOp.sender}...`);

        // In a real bundler, we would validate validitySimulate, etc.
        // Here we just submit to EntryPoint.

        try {
            const tx = await this.entryPoint.handleOps([userOp], this.signer.address);
            console.log(`[Bundler] Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`[Bundler] Transaction confirmed in block ${receipt.blockNumber}`);
            return receipt;
        } catch (error) {
            console.error("[Bundler] Submission failed:", error);
            throw error;
        }
    }

    // Helper to construct a partial UserOp that the User will sign
    async prepareUserOp(sender, callData, initCode = "0x") {
        const nonce = await this.getNonce(sender);

        // Basic Gas estimation (hardcoded for simplified demo, or use provider.estimateGas in real impl)
        const userOp = {
            sender,
            nonce,
            initCode,
            callData,
            callGasLimit: 100000,
            verificationGasLimit: 150000,
            preVerificationGas: 50000,
            maxFeePerGas: ethers.parseUnits("300", "gwei"), // Coston2 usually needs high gas price or check network
            maxPriorityFeePerGas: ethers.parseUnits("50", "gwei"),
            paymasterAndData: this.paymasterAddress || "0x", // If paymaster used
            signature: "0x" // To be filled by user
        };
        return userOp;
    }
}

module.exports = BundlerService;
