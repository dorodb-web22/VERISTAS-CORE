// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@account-abstraction/contracts/samples/SimpleAccountFactory.sol";
import "./VeristasAccount.sol";

contract VeristasFactory is SimpleAccountFactory {
    constructor(IEntryPoint _entryPoint) SimpleAccountFactory(_entryPoint) {}

    // Override to use VeristasAccount
    function createAccount(address owner, uint256 salt) public override returns (SimpleAccount ret) {
        address addr = getAddress(owner, salt);
        uint256 codeSize = addr.code.length;
        if (codeSize > 0) {
            return SimpleAccount(payable(addr));
        }
        ret = new VeristasAccount{salt: bytes32(salt)}(entryPoint);
        ret.initialize(owner);
    }
}
