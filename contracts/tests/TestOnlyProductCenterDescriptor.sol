// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../IProductCenterDescriptor.sol";

contract TestOnlyProductCenterDescriptor is IProductCenterDescriptor {
    // product center => product center info
    mapping(address => BasicInfo) private _productCenterBasics;

    // product id => product information
    mapping(uint256 => BasicInfo) private _productBasics;

    function setProductCenterInfo(
        address productCenter, BasicInfo memory basic
    ) external {
        _productCenterBasics[productCenter] = basic;
    }

    function setProductInfo(
        uint256 productId, BasicInfo memory basic
    ) external {
        _productBasics[productId] = basic;
    }

    function getProductCenterInfo(
        address productCenter
    ) external view override returns (BasicInfo memory) {}

    function getProductInfo(
        uint256 productId
    ) external view override returns (BasicInfo memory) {}

}