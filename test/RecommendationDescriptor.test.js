const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
// const { deployMockContract } = waffle;

describe('Recommendation', function () {
    let owner, player, longVoucher, recommendation;

    beforeEach(async () => {
        [owner, player] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongVoucher", 18, owner.address);

        const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
        const metadataDescriptor = await metadataDescriptorFactory.deploy();
        await metadataDescriptor.initialize(longVoucher.address, owner.address);

        // set metadata descriptor
        await longVoucher.setMetadataDescriptor(metadataDescriptor.address);

        const recommendationFactory = await ethers.getContractFactory('Recommendation');
        recommendation = await recommendationFactory.deploy();
        await longVoucher.connect(owner).addSlotManager(recommendation.address, [20]);
        await recommendation.initialize(longVoucher.address, 20, owner.address);

        const svgFactory = await ethers.getContractFactory('QualSVG');
        const svg = await svgFactory.deploy();

        const plainMetadataProviderFactory = await ethers.getContractFactory('PlainMetadataProvider');
        const plainMetadataProvider = await plainMetadataProviderFactory.deploy("Qualification", "Qualification certificate", "www.longfil.io", svg.address);

        //  set metadata provider
        await metadataDescriptor.setMetadataProvider(recommendation.address, plainMetadataProvider.address);

    });

    describe('svg', function () {
        it('svg', async function () {
            recommendation.mint(player.address);
            const tokenId = await longVoucher.tokenOfOwnerByIndex(player.address, 0);

            console.log(await longVoucher.tokenURI(tokenId));
        });
    });

});