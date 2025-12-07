const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    const EntryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

    // 1. Deploy Factory
    const VeristasFactory = await hre.ethers.getContractFactory("VeristasFactory");
    const factory = await VeristasFactory.deploy(EntryPointAddress);
    await factory.waitForDeployment();
    const factoryAddr = await factory.getAddress();
    console.log("VeristasFactory deployed to:", factoryAddr);

    // 2. Deploy Paymaster
    const VeristasPaymaster = await hre.ethers.getContractFactory("VeristasPaymaster");
    // Owner is signer for now
    const paymaster = await VeristasPaymaster.deploy(EntryPointAddress, deployer.address);
    await paymaster.waitForDeployment();
    const paymasterAddr = await paymaster.getAddress();
    console.log("VeristasPaymaster deployed to:", paymasterAddr);

    // 3. Fund Paymaster (Optional but recommended for testing)
    // console.log("Funding Paymaster...");
    // await deployer.sendTransaction({to: paymasterAddr, value: hre.ethers.parseEther("1.0")});

    // Save to backend .env or file
    const configPath = path.join(__dirname, 'backend', '.env'); // Assuming run from root
    // We'll just log for now, or append.
    console.log(`\nAdd these to backend/.env:\nFACTORY_ADDRESS=${factoryAddr}\nPAYMASTER_ADDRESS=${paymasterAddr}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
