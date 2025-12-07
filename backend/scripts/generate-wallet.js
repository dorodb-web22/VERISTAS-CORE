const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    const wallet = ethers.Wallet.createRandom();
    console.log("New Wallet Generated:");
    console.log("Address:", wallet.address);
    console.log("PrivateKey:", wallet.privateKey);

    // Update .env
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Replace the zero key
    envContent = envContent.replace(
        /PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000/,
        `PRIVATE_KEY=${wallet.privateKey}`
    );
    // Add Public Address for reference
    if (!envContent.includes("WALLET_ADDRESS")) {
        envContent += `\nWALLET_ADDRESS=${wallet.address}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("Updated .env with new Private Key");
}

main();
