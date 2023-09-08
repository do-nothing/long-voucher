// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../IFilForwarder.sol";

contract TestOnlyFilForwarder is IFilForwarder {
    function forward(bytes calldata destination_) external payable override {
        require(destination_.length == 20, "illegal destination");

        address destination = bytesToAddress(destination_);

        (bool sent, ) = destination.call{value: msg.value}("");
        require(sent, "send error");
    }

    function bytesToAddress(
        bytes memory bys
    ) private pure returns (address addr) {
        assembly {
            addr := mload(add(bys, 20))
        }
    }
}
