require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "./backend/.env" }); // Load from backend .env

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

module.exports = {
    solidity: {
        version: "0.8.20", // EIP-4337 usually needs recent solidity
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        coston2: {
            url: "https://coston2-api.flare.network/ext/C/rpc",
            accounts: [PRIVATE_KEY],
            chainId: 114
        }
    }
};
