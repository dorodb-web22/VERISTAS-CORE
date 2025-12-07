import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import './App.css';

// Placeholder addresses - User should update these after Remix deployment
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000000"; // REPLACE_ME
const PAYMASTER_ADDRESS = "0x0000000000000000000000000000000000000000"; // REPLACE_ME

function App() {
  const [review, setReview] = useState("");
  const [status, setStatus] = useState("Idle");
  const [wallet, setWallet] = useState(null);
  const [smartAccount, setSmartAccount] = useState(null);
  const [price, setPrice] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);

  // Initialize Wallet
  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setWallet(signer);
        setStatus("Wallet Connected: " + await signer.getAddress());

        // Fetch Price
        try {
          const res = await axios.get("http://localhost:3000/api/quote-reward");
          setPrice(res.data.flrPrice);
        } catch (e) { console.error("API Error", e); }

      } else {
        setStatus("Please install MetaMask");
      }
    }
    init();
  }, []);

  const handleReviewSubmit = async () => {
    if (!review) return alert("Enter a review!");
    setStatus("Processing Review...");

    try {
      // 1. Prepare Data
      // In a real AA flow, we would calculate the UserOp here using the Factory and Paymaster.
      // For this hackathon demo (since we pivoted to Remix), we will simulate the flow 
      // where the backend handles the "heavy lifting" of the bundling logic if we send the intent.

      // However, to show "Gasless", we really want the UserOp.
      // Let's create a partial UserOp intent.

      const userOpIntent = {
        sender: wallet ? await wallet.getAddress() : "0x...", // Using EOA as proxy for Smart Account owner for now
        signature: "0xMockSignature" // In real 4337, this is signed over UserOpHash
      };

      // 2. Call Backend API
      setStatus("Sending to Backend for FDC Verification & Reward...");
      const response = await axios.post("http://localhost:3000/api/verify-and-reward", {
        reviewText: review,
        userOp: userOpIntent
      });

      console.log("Response:", response.data);
      setVerificationResult(response.data.attestation);

      if (response.data.txHash) {
        setTxHash(response.data.txHash);
        setStatus("Success! Reward Sent.");
      } else {
        setStatus("Verified! (Mock Mode - No Tx)");
      }

    } catch (e) {
      console.error(e);
      setStatus("Error: " + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>The Flare Trust Core</h1>
        <p>Verifiable B2B Reputation Platform</p>
        {price && <div className="price-tag">FLR Price: ${price}</div>}
      </header>

      <main>
        <div className="card">
          <h2>Submit Verified Review</h2>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Write your honest review here..."
          />
          <button onClick={handleReviewSubmit} disabled={status.includes("Processing")}>
            Submit Review (Gasless)
          </button>
          <div className="status">{status}</div>
        </div>

        {verificationResult && (
          <div className="card result">
            <h3>Verification Proof</h3>
            <p><strong>Review Hash:</strong> {verificationResult.reviewHash}</p>
            <p><strong>Commitment Tx:</strong> {verificationResult.commitmentTx}</p>
            <p><strong>Attestation Status:</strong> {verificationResult.status}</p>
          </div>
        )}

        {txHash && (
          <div className="card success">
            <h3>Reward Transaction</h3>
            <a href={`https://coston2-explorer.flare.network/tx/${txHash}`} target="_blank" rel="noreferrer">
              View on Block Explorer
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
