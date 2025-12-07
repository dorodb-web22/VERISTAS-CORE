// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/samples/VerifyingPaymaster.sol";

// We use the standard VerifyingPaymaster. 
// The off-chain service signs the UserOp hash if the review is valid.
contract VeristasPaymaster is VerifyingPaymaster {
    constructor(IEntryPoint _entryPoint, address _verifyingSigner) 
        VerifyingPaymaster(_entryPoint, _verifyingSigner) 
    {}
}
