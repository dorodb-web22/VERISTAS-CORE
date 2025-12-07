// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/samples/SimpleAccount.sol";

// We inherit SimpleAccount directly for the hackathon
contract VeristasAccount is SimpleAccount {
    constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {}
    
    // We can add custom logic here, e.g. storing the "Unverified Score"
    uint256 public reputationScore;
    
    function increaseScore(uint256 amount) external {
        // Only Paymaster or Owner should be able to trigger this in a gasless flow?
        // Actually, normally 'execute' calls this.
        // For the Veristas logic, we want the business (Paymaster) to validate before paying gas.
        reputationScore += amount;
    }
}
