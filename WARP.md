# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository overview

This repo is a small monorepo with three main parts:
- **Smart contracts (Hardhat)** at the repo root under `contracts/` plus `scripts/` and `hardhat.config.js`.
- **Backend service** in `backend/`, an Express API server plus helper services that talk to Flare network components.
- **Frontend dApp** in `frontend/`, a React + Vite single-page app that calls the backend and connects to the user's wallet.

The overall flow is:
1. User connects a browser wallet in the frontend and submits a B2B review.
2. The frontend sends the review (and a simplified UserOperation intent) to the backend.
3. The backend:
   - Hashes and commits the review on-chain via the **FDC** (Flare Data Connector) attestation flow.
   - Queries **FTSO** for FLR/USD pricing.
   - Optionally submits a **4337 UserOperation** through the EntryPoint using the Paymaster for gas sponsorship.
4. The frontend displays the attestation info and (if present) the reward transaction hash.

## Smart contracts (Hardhat)

**Location:** repo root
- `contracts/VeristasAccount.sol`
  - Extends the AA sample `SimpleAccount` from `@account-abstraction/contracts`.
  - Adds a `reputationScore` state variable and an `increaseScore(uint256 amount)` function meant to be called in gasless flows (typically controlled by the Paymaster/business logic).
- `contracts/VeristasFactory.sol`
  - Extends `SimpleAccountFactory` but overrides `createAccount` to deploy `VeristasAccount` instead of the base `SimpleAccount`.
  - Uses `getAddress(owner, salt)` and checks `code.length` to avoid re-deploying if the account already exists.
- `contracts/VeristasPaymaster.sol`
  - Extends the sample `VerifyingPaymaster` and delegates verification to an off-chain signer.

**Hardhat configuration:** `hardhat.config.js`
- Uses `@nomicfoundation/hardhat-toolbox`.
- Loads environment variables from `backend/.env` via `dotenv`.
- Configures Solidity `0.8.20` with optimizer enabled (200 runs).
- Defines a `coston2` network:
  - URL: `https://coston2-api.flare.network/ext/C/rpc`.
  - `accounts`: single private key from `PRIVATE_KEY` in `backend/.env` (or a zero key fallback).

**Deployment script:** `scripts/deploy.js`
- Uses a fixed EntryPoint address (`0x5FF1...2789`), matching the standard 0.6.0 EntryPoint.
- Deploys `VeristasFactory` and `VeristasPaymaster` wired to that EntryPoint.
- Logs the deployed addresses and hints that they should be added to `backend/.env` as `FACTORY_ADDRESS` and `PAYMASTER_ADDRESS` (the script currently just logs them).

## Backend service

**Location:** `backend/`

**Entry point:** `backend/server.js`
- Express server with CORS and JSON body parsing.
- Instantiates services:
  - `FdcService` (`services/fdc-service.js`)
  - `FtsoService` (`services/ftso-service.js`)
  - `BundlerService` (`services/bundler-service.js`), constructed with `PAYMASTER_ADDRESS` from environment.
- HTTP endpoints:
  - `GET /api/quote-reward`
    - Calls `FtsoService.getFlrPrice()` to fetch (or mock) FLR/USD price.
    - Returns `{ rewardAmount, flrPrice }` where `rewardAmount` is currently a fixed demo value.
  - `POST /api/verify-and-reward`
    - Expects `{ reviewText, userOp }` in the JSON body.
    - Pipeline:
      1. `FdcService.submitReview(reviewText)` to hash, commit, and request an attestation (mocked submission for demo).
      2. `FtsoService.getFlrPrice()` for price context.
      3. If `userOp` is provided, submits it via `BundlerService.submitUserOp(userOp)` to the EntryPoint.
    - Response includes `attestation`, `priceData`, and optional `txHash` for the reward transaction.
- Listens on `PORT` from `.env` or `3000` by default.

**FdcService:** `backend/services/fdc-service.js`
- Uses `ethers` and env-configured provider/wallet:
  - `RPC_URL` – JSON-RPC endpoint for Coston2.
  - `PRIVATE_KEY` – business wallet key used to commit reviews and (optionally) pay FDC fees.
  - `FDC_HUB_ADDRESS` – address of the on-chain FDC hub contract.
- `submitReview(reviewText)`:
  - Hashes the review with `keccak256`.
  - Sends a 0-value transaction to `wallet.address` with `data = reviewHash` as a commitment.
  - Prepares an ABI-encoded attestation request for the `EVMTransaction` verification type and (currently) **mocks** the actual FDC hub call to avoid spending testnet funds.
  - Returns `{ reviewHash, commitmentTx, status }`.
- Also usable as a CLI tool when run directly: reads a review string from `process.argv[2]`.

**FtsoService:** `backend/services/ftso-service.js`
- Talks to the FTSO V2 contract on Coston2 (address from code) via a minimal ABI.
- Uses a fixed FLR/USD feed ID constant.
- `getFlrPrice()`:
  - Queries the FTSO contract for price and decimals.
  - Returns a formatted numeric price and raw value.
  - On failure (bad ABI, network error, etc.), logs and returns a **mock price** instead, so the rest of the flow still works.
- Also has a CLI mode when executed directly.

**BundlerService:** `backend/services/bundler-service.js`
- Implements a minimal 4337 bundler targeting the standard EntryPoint (`ENTRY_POINT_ADDRESS` constant in file).
- Env dependencies:
  - `RPC_URL` – JSON-RPC provider URL.
  - `PRIVATE_KEY` – signer used as the bundler (also acts as beneficiary for `handleOps`).
- Core methods:
  - `getNonce(accountAddress)` → reads EntryPoint nonce for `sender`.
  - `submitUserOp(userOp)` → wraps the provided UserOperation in a single-element array and passes it to `entryPoint.handleOps`, returning the transaction receipt.
  - `prepareUserOp(sender, callData, initCode = '0x')` → builds a partial user operation with basic gas fields and `paymasterAndData` set to the configured Paymaster address (or `0x` if none).

**Utility script:** `backend/scripts/generate-wallet.js`
- Generates a new random `ethers.Wallet`.
- Expects `backend/.env` to contain a placeholder `PRIVATE_KEY=0x0000...000` line and replaces it with the new private key.
- Appends `WALLET_ADDRESS=<public address>` if not already present.

**Backend environment expectations (`backend/.env`)

The actual values are not committed, but the code expects at least:
- `RPC_URL` – Coston2 RPC URL.
- `PRIVATE_KEY` – private key used by FdcService and BundlerService.
- `FDC_HUB_ADDRESS` – FDC hub contract address.
- `PAYMASTER_ADDRESS` – deployed `VeristasPaymaster` address (for bundler/paymaster integration).
- `PORT` – optional, Express port (defaults to 3000).
- Optionally `FACTORY_ADDRESS` and other addresses you may want to store after deployment.

Note: `hardhat.config.js` also loads `backend/.env`, so `PRIVATE_KEY` defined there is reused for contract deployment.

## Frontend dApp (React + Vite)

**Location:** `frontend/`

- Created from the standard `React + Vite` template; ESLint is configured via `eslint.config.js` and can be expanded as needed.
- Entry point: `src/main.jsx` renders `<App />` inside React `StrictMode`.
- Core UI logic: `src/App.jsx`.
  - On mount, if `window.ethereum` is present:
    - Creates an `ethers.BrowserProvider`.
    - Requests a signer and stores it in component state.
    - Calls `GET http://localhost:3000/api/quote-reward` to fetch the current FLR price and display it.
  - Review submission flow:
    - User types a review into a textarea.
    - On "Submit Review (Gasless)", builds a simplified `userOpIntent` object with `sender` set to the current EOA and a mock signature.
    - Sends `POST http://localhost:3000/api/verify-and-reward` with `{ reviewText, userOp: userOpIntent }`.
    - Displays the returned attestation (`reviewHash`, `commitmentTx`, `status`).
    - If a `txHash` is returned, renders a link to the Coston2 explorer for that transaction.
  - Contains placeholder constants `FACTORY_ADDRESS` and `PAYMASTER_ADDRESS` which should be updated to the real deployed values when the contracts are live.

## Commands and workflows

### Install dependencies

- **Root (Hardhat & shared dev deps):**
  - From repo root: `npm install`
- **Backend:**
  - `cd backend`
  - `npm install`
- **Frontend:**
  - `cd frontend`
  - `npm install`

### Smart contracts (Hardhat)

Run these from the **repo root**:

- **Compile contracts:**
  - `npx hardhat compile`
- **Run all tests (when you add them):**
  - `npx hardhat test`
- **Run a single test file:**
  - `npx hardhat test test/<your-test-file>.ts`
- **Deploy Factory + Paymaster to Coston2:**
  - `npx hardhat run scripts/deploy.js --network coston2`

Before deploying, ensure:
- `backend/.env` exists and has a funded `PRIVATE_KEY` for the Coston2 network.
- `RPC_URL` in `backend/.env` points to a working Coston2 node (if you reuse `RPC_URL` inside Hardhat tasks/scripts).

### Backend service

Run from the **`backend/` directory** unless stated otherwise.

- **Start the HTTP API server:**
  - `cd backend`
  - `node server.js`
- **Generate a new wallet and update `.env`:**
  - `cd backend`
  - `node scripts/generate-wallet.js`
- **Test FDC integration from the CLI:**
  - `cd backend`
  - `node services/fdc-service.js "This is a sample review"`
- **Test FTSO price fetch from the CLI:**
  - `cd backend`
  - `node services/ftso-service.js`

These commands assume `backend/.env` defines the required values (`RPC_URL`, `PRIVATE_KEY`, `FDC_HUB_ADDRESS`, `PAYMASTER_ADDRESS`, etc.).

### Frontend (React + Vite)

Run from the **`frontend/` directory**.

- **Development server:**
  - `cd frontend`
  - `npm run dev`
- **Production build:**
  - `cd frontend`
  - `npm run build`
- **Preview built app:**
  - `cd frontend`
  - `npm run preview`
- **Lint frontend code:**
  - `cd frontend`
  - `npm run lint`

The frontend assumes the backend is reachable at `http://localhost:3000`. Make sure the backend server is running on that port (or update the Axios URLs in `src/App.jsx` accordingly).

## Key integration points for future changes

- When modifying the **attestation logic**, touch both:
  - `backend/services/fdc-service.js` (how reviews are committed and attestation requests are encoded), and
  - `backend/server.js` (how attestation results are returned to the client).
- When changing how **rewards are calculated or priced**, adjust:
  - `backend/services/ftso-service.js` (price source and formatting), and
  - the reward computation inside `GET /api/quote-reward` in `backend/server.js`.
- When updating **account abstraction behavior** (e.g., reputation scoring or paymaster policy), consider:
  - `contracts/VeristasAccount.sol` (on-chain reputation fields and methods),
  - `contracts/VeristasFactory.sol` (how accounts are deployed),
  - `contracts/VeristasPaymaster.sol` (verification model), and
  - `backend/services/bundler-service.js` (how UserOperations are constructed and submitted).
- When changing API shapes, keep `backend/server.js` and the corresponding Axios calls in `frontend/src/App.jsx` in sync.
