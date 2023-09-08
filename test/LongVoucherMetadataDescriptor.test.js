const { expect, assert } = require('chai');
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const Errors = require("./errors");

const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("admin"));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const CASHIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cashier"));


function newProductParameters(totalQuota, minSubscriptionAmount, beginSubscriptionBlock, endSubscriptionBlock, minHoldingDuration, interestRate) {
    return {
        // 总额度
        totalQuota: totalQuota,
        // 最小认购金额
        minSubscriptionAmount: minSubscriptionAmount,
        // 认购起始区块
        beginSubscriptionBlock: beginSubscriptionBlock,
        // 认购结束区块
        endSubscriptionBlock: endSubscriptionBlock,
        // 区块数表示的最少持有时长
        minHoldingDuration: minHoldingDuration,
        // 利息
        interestRate: interestRate,
        cashPool: ethers.constants.AddressZero
    };
}

describe('LongVoucherMetadataDescriptor', function () {
    const productId = 1;
    let owner, operator, cashier, subscriber, longVoucher, productCenter, productCenterDescriptor, metadataDescriptor, tokenId;

    beforeEach(async () => {
        [owner, operator, cashier, subscriber, longVoucher, productCenter, productCenterDescriptor, metadataDescriptor, tokenId] = await setup();
    });

    async function setup() {
        const [owner, operator, cashier, subscriber] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        const longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongFil", 18, owner.address);

        const recommendationCenterFactory = await ethers.getContractFactory('TestOnlyRecommendationCenter');
        const recommendationCenter = await recommendationCenterFactory.deploy();

        const filForwarderFactory = await ethers.getContractFactory('TestOnlyFilForwarder');
        const filForwarder = await filForwarderFactory.deploy();

        const productCenterFactory = await ethers.getContractFactory('ProductCenter');
        const productCenter = await productCenterFactory.deploy();
        await productCenter.initialize(longVoucher.address, recommendationCenter.address, filForwarder.address, owner.address);

        const interestRateFactory = await ethers.getContractFactory('TestOnlyInterestRate');
        const interestRate = await interestRateFactory.deploy();

        const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
        const productCenterDescriptor = await productCenterDescriptorFactory.deploy();
        await productCenterDescriptor.initialize(longVoucher.address);

        const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
        const metadataDescriptor = await metadataDescriptorFactory.deploy();
        await metadataDescriptor.initialize(longVoucher.address, owner.address);

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);
        await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);

        // create product
        const nowBlockNumer = await helpers.time.latestBlock();
        const parameters = newProductParameters(
            ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + 2880 + 1, 100, interestRate.address);
        await productCenter.connect(operator).create(productId, parameters);
        // console.log(await productCenter.getProductParameters(productId));

        // subscribe
        const principal = ethers.utils.parseEther("10");
        await productCenter.connect(subscriber).subscribe(productId, { value: principal });

        // get token Id
        const tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);

        //  set metadata provider
        await metadataDescriptor.setMetadataProvider(productCenter.address, productCenterDescriptor.address);
        expect(await metadataDescriptor.getMetadataProvider(productCenter.address)).to.equal(productCenterDescriptor.address);

        return [owner, operator, cashier, subscriber, longVoucher, productCenter, productCenterDescriptor, metadataDescriptor, tokenId];
    }

    describe('test', function () {
        it('test', async function () {
            const voucherSVGFactory = await ethers.getContractFactory('TestOnlyVoucherSVG');
            const voucherSVG = await voucherSVGFactory.deploy();
            await productCenterDescriptor.connect(owner).setProductCenterVoucherSVG(productCenter.address, voucherSVG.address);

            await productCenterDescriptor.connect(owner).setProductCenterInfo(productCenter.address, {name: "CORE-Core", desc: "core", link:"www.longfil.io"});
            await productCenterDescriptor.connect(operator).setProductInfo(productId, {name: "product no.1", desc: "Fixed rate product no.1", link: "www.longfil.io/1"});

            // console.log(await metadataDescriptor.constructContractURI());
            // console.log(await metadataDescriptor.constructSlotURI(productId));
            console.log(await metadataDescriptor.constructTokenURI(tokenId));
        });
    });
});