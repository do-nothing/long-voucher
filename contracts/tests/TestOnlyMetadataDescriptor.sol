// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@solvprotocol/erc-3525/periphery/interface/IERC3525MetadataDescriptor.sol";

contract TestOnlyMetadataDescriptor is IERC3525MetadataDescriptor {
    string public contractURI;
    mapping(uint256 => string) public slotURIs;
    mapping(uint256 => string) public tokenURIs;

    function setContractURI(string memory contractURI_) external {
        contractURI = contractURI_;
    }

    function setSlotURI(uint256 slot_, string memory slotURI_) external {
        slotURIs[slot_] = slotURI_;
    }

    function setTokenURI(uint256 tokenId_, string memory tokenURI_) external {
        tokenURIs[tokenId_] = tokenURI_;
    }

    function constructContractURI()
        external
        view
        override
        returns (string memory)
    {
        return contractURI;
    }

    function constructSlotURI(
        uint256 slot
    ) external view override returns (string memory) {
        return slotURIs[slot];
    }

    function constructTokenURI(
        uint256 tokenId
    ) external view override returns (string memory) {
        return tokenURIs[tokenId];
    }
}