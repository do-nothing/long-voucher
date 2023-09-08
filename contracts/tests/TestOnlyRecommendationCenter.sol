// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../IRecommendationCenter.sol";

contract TestOnlyRecommendationCenter is IRecommendationCenter {
    struct EquitiesTransfer {
        uint256 productId;
        address from;
        address to;
        uint256 fromVoucherId;
        uint256 toVoucherId;
        uint256 value;
    }

    EquitiesTransfer public equitiesTransfer;

    function onEquitiesTransfer(
        uint256 productId_,
        address from_,
        address to_,
        uint256 fromVoucherId_,
        uint256 toVoucherId_,
        uint256 value_
    ) external override {
        equitiesTransfer = EquitiesTransfer({
            productId: productId_,
            from: from_,
            to: to_,
            fromVoucherId: fromVoucherId_,
            toVoucherId: toVoucherId_,
            value: value_
        });
    }
}