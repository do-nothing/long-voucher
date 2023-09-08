
const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const VALUE = ethers.utils.parseEther("1");

describe('EarningsSVG', function () {
    let longVoucher, tokenId;

    beforeEach(async () => {
        [owner] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongVoucher", 18, owner.address);

        await longVoucher.connect(owner).addSlotManager(owner.address, []);
        await longVoucher.connect(owner).claimSlot(1);
        await longVoucher.connect(owner).mint(owner.address, 1, VALUE);

        tokenId = await longVoucher.tokenOfOwnerByIndex(owner.address, 0);

        const svgFactory = await ethers.getContractFactory('EarningsSVG');
        svg = await svgFactory.deploy(longVoucher.address);
    });

    describe('test', function () {
        it('test', async function () {
            console.log(ethers.utils.toUtf8String(await svg.generateSVG(tokenId)))
        });

    });
});