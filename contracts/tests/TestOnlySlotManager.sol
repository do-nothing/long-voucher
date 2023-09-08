// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../ILongVoucher.sol";
import "../ISlotManager.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract TestOnlySlotManager is ISlotManager, IERC165 {
    struct ValueTransfer {
        address from_;
        address to_;
        uint256 fromTokenId_;
        uint256 toTokenId_;
        uint256 slot_;
        uint256 value_;
    }

    ILongVoucher public longVoucher;
    ValueTransfer public beforeValueTransfer_;
    ValueTransfer public afterValueTransfer_;

    constructor(address longVoucher_) {
        longVoucher = ILongVoucher(longVoucher_);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure override returns (bool) {
        return type(ISlotManager).interfaceId == interfaceId;
    }

    function beforeValueTransfer(
        address from_,
        address to_,
        uint256 fromTokenId_,
        uint256 toTokenId_,
        uint256 slot_,
        uint256 value_
    ) external override {
        beforeValueTransfer_ = ValueTransfer({
            from_: from_,
            to_: to_,
            fromTokenId_: fromTokenId_,
            toTokenId_: toTokenId_,
            slot_: slot_,
            value_: value_
        });
    }

    function afterValueTransfer(
        address from_,
        address to_,
        uint256 fromTokenId_,
        uint256 toTokenId_,
        uint256 slot_,
        uint256 value_
    ) external override {
        afterValueTransfer_ = ValueTransfer({
            from_: from_,
            to_: to_,
            fromTokenId_: fromTokenId_,
            toTokenId_: toTokenId_,
            slot_: slot_,
            value_: value_
        });
    }

    function claimSlot(uint256 slot_) external {
        return longVoucher.claimSlot(slot_);
    }

    function mint(
        address to_,
        uint256 slot_,
        uint256 value_
    ) external returns (uint256) {
        return longVoucher.mint(to_, slot_, value_);
    }

    function burn(uint256 tokenId_) external {
        return longVoucher.burn(tokenId_);
    }
}