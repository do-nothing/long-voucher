// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../IInterestRate.sol";

contract TestOnlyTieredInterestRate is IInterestRate {
    uint constant SCALE = 1e36;

    // 30 secs per block
    uint256 public constant BLOCKS_PER_DAY = (24 * 3600) / 30;
    uint256 public constant BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365;

    // blocks of 1 days
    uint256 public constant BLOCKS_1_DAYS = 1 * BLOCKS_PER_DAY;
    // blocks of 2 days
    uint256 public constant BLOCKS_2_DAYS = 2 * BLOCKS_PER_DAY;
    // blocks of 3 days
    uint256 public constant BLOCKS_3_DAYS = 3 * BLOCKS_PER_DAY;

    uint256 public constant BLOCK_RATE_HOLDING_LE_1 = (20 * SCALE) / 100 / BLOCKS_PER_YEAR;
    uint256 public constant BLOCK_RATE_HOLDING_LE_2 = (30 * SCALE) / 100 / BLOCKS_PER_YEAR;
    uint256 public constant BLOCK_RATE_HOLDING_LE_3 = (40 * SCALE) / 100 / BLOCKS_PER_YEAR;
    uint256 public constant BLOCK_RATE_HOLDING_GT_3 = (50 * SCALE) / 100 / BLOCKS_PER_YEAR;

    // interest rate in subscription stage
    uint256 public constant BLOCK_RATE_SUBSCRIPTION = BLOCK_RATE_HOLDING_LE_1;

    function calculate(
        uint256 principal,
        uint256 beginSubscriptionBlock,
        uint256 endSubscriptionBlock,
        uint256 beginBlock,
        uint256 endBlock
    ) external view override returns (uint256) {
        // pre subscription
        if (block.number < beginSubscriptionBlock) {
            return 0;
        }

        // in subscription
        if (block.number < endSubscriptionBlock) {
            require(
                beginBlock >= beginSubscriptionBlock &&
                    endBlock <= endSubscriptionBlock,
                "illegal block range 1"
            );
            return (principal * BLOCK_RATE_SUBSCRIPTION * (endBlock - beginBlock)) / SCALE;
        }

        // online
        require(
            beginBlock >= endSubscriptionBlock && endBlock <= block.number,
            "illegal block range 2"
        );

        uint256 blockDelta = endBlock - beginBlock;
        uint256 holdingDuration = block.number - endSubscriptionBlock;
        if (holdingDuration <= BLOCKS_1_DAYS) {
            return (principal * BLOCK_RATE_HOLDING_LE_1 * blockDelta) / SCALE;
        } else if (holdingDuration <= BLOCKS_2_DAYS) {
            return (principal * BLOCK_RATE_HOLDING_LE_2 * blockDelta) / SCALE;
        } else if (holdingDuration <= BLOCKS_3_DAYS) {
            return (principal * BLOCK_RATE_HOLDING_LE_3 * blockDelta) / SCALE;
        } else {
            return (principal * BLOCK_RATE_HOLDING_GT_3 * blockDelta) / SCALE;
        }
    }

    function nowAPR(
        uint256 beginSubscriptionBlock,
        uint256 endSubscriptionBlock
    ) external view override returns (string memory) {
        beginSubscriptionBlock;

        if (block.number < endSubscriptionBlock) {
            return "0%";
        } else {
            uint256 holdingDuration = block.number - endSubscriptionBlock;
            if (holdingDuration <= BLOCKS_1_DAYS) {
                return "20%";
            } else if (holdingDuration <= BLOCKS_2_DAYS) {
                return "30%";
            } else if (holdingDuration <= BLOCKS_3_DAYS) {
                return "40%";
            } else {
                return "50%";
            }
        }
    }
}
