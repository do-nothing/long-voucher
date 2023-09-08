// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../IInterestRate.sol";

// 1% per block
contract TestOnlyInterestRate is IInterestRate {
    uint constant SCALE = 1e36;

    // 30 secs per block
    uint256 public constant BLOCKS_PER_DAY = (24 * 3600) / 30;
    uint256 public constant BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365;

    uint256 public constant BLOCK_RATE = (10 * SCALE) / 100 / BLOCKS_PER_YEAR;

    function calculate(
        uint256 principal,
        uint256 beginSubscriptionBlock,
        uint256 endSubscriptionBlock,
        uint256 beginBlock,
        uint256 endBlock
    ) external view override returns (uint256) {
        require(
            beginSubscriptionBlock < endSubscriptionBlock &&
                beginBlock <= endBlock,
            "illegal block range 1"
        );

        // before subscription
        if (block.number < beginSubscriptionBlock) {
            return 0;
        }

        // in subscription
        if (block.number < endSubscriptionBlock) {
            require(
                beginBlock >= beginSubscriptionBlock &&
                    endBlock <= endSubscriptionBlock,
                "illegal block range 2"
            );
            return (principal * BLOCK_RATE * (endBlock - beginBlock)) / SCALE;
        }

        // online
        require(
            beginBlock >= endSubscriptionBlock && endBlock <= block.number,
            "illegal block range 3"
        );

        uint256 blockDelta = endBlock - beginBlock;
        return (principal * BLOCK_RATE * blockDelta) / SCALE;
    }

    function nowAPR(
        uint256 beginSubscriptionBlock,
        uint256 endSubscriptionBlock
    ) external view override returns (string memory) {
        beginSubscriptionBlock;

        if (block.number < endSubscriptionBlock) {
            return "0%";
        } else {
            return "10%";
        }
    }
}