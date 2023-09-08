const { expect, assert } = require('chai');
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const Errors = require("./errors");
const { string } = require('hardhat/internal/core/params/argumentTypes');

const MIN_SUBSCRIPTION_PERIOD = 2880;
const MAX_SUBSCRIPTION_PERIOD = 2880 * 28;

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

describe('ProductCenterDescriptor', function () {
    const productId = 10000;
    let owner, operator, longVoucher, interestRate, productCenter, descriptor, tokenId, productCenterHelper;

    beforeEach(async () => {
        [owner, operator, longVoucher, interestRate, productCenter, descriptor, tokenId, productCenterHelper] = await setup();
    });

    async function setup() {
        const [owner, operator] = await ethers.getSigners();

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

        const descriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
        const descriptor = await descriptorFactory.deploy();
        await descriptor.initialize(longVoucher.address);

        const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
        const metadataDescriptor = await metadataDescriptorFactory.deploy();
        await metadataDescriptor.initialize(longVoucher.address, owner.address);

        const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
        const productCenterHelper = await productCenterHelperFactory.deploy(longVoucher.address);

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);
        await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);

        await longVoucher.setMetadataDescriptor(metadataDescriptor.address);
        //  set metadata provider
        await metadataDescriptor.setMetadataProvider(productCenter.address, descriptor.address);

        // create product
        const nowBlockNumer = await helpers.time.latestBlock();
        const parameters = newProductParameters(
            ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
        await productCenter.connect(operator).create(productId, parameters);
        // console.log(await productCenter.getProductParameters(productId));

        // subscribe
        const principal = ethers.utils.parseEther("10");
        await productCenter.connect(owner).subscribe(productId, { value: principal });

        // get token Id
        const tokenId = await longVoucher.tokenOfOwnerByIndex(owner.address, 0);

        return [owner, operator, longVoucher, interestRate, productCenter, descriptor, tokenId, productCenterHelper];
    }

    describe('initialization', function () {
        it('initialization', async function () {
            expect(await descriptor.longVoucher()).to.equal(longVoucher.address);
        });
    });
    describe('admin functions', function () {
        it('setProductCenterInfo', async function () {
            const name = "Longfil Lab";
            const desc = "The Longfil Lab";
            const link = "www.longfil.io";
            await expect(descriptor.connect(operator).setProductCenterInfo(productCenter.address, { name, desc, link })).to.be.revertedWith("not admin");
            await descriptor.connect(owner).setProductCenterInfo(productCenter.address, { name, desc, link });
            const info = await descriptor.getProductCenterInfo(productCenter.address);
            expect(info.name).to.equal(name);
            expect(info.desc).to.equal(desc);
            expect(info.link).to.equal(link);
        });

        it('setProductInfo', async function () {
            const name = "product no.1";
            const desc = "Fixed rate product no.1";
            const link = "www.longfil.io/1";
            await expect(descriptor.connect(owner).setProductInfo(productId, { name, desc, link })).to.be.revertedWith("not operator");
            await descriptor.connect(operator).setProductInfo(productId, { name, desc, link });
            const info = await descriptor.getProductInfo(productId);
            expect(info.name).to.equal(name);
            expect(info.desc).to.equal(desc);
            expect(info.link).to.equal(link);
        });

        it('setProductCenterVoucherSVG', async function () {
            const voucherSVGFactory = await ethers.getContractFactory('TestOnlyVoucherSVG');
            const voucherSVG = await voucherSVGFactory.deploy();

            await expect(descriptor.connect(operator).setProductCenterVoucherSVG(productCenter.address, voucherSVG.address)).to.be.revertedWith("not admin");

            await descriptor.connect(owner).setProductCenterVoucherSVG(productCenter.address, voucherSVG.address);
            expect(await descriptor.voucherSVG(tokenId)).to.equal(voucherSVG.address);
        });

        it('setProductVoucherSVG', async function () {
            const voucherSVGFactory = await ethers.getContractFactory('TestOnlyVoucherSVG');
            const voucherSVG = await voucherSVGFactory.deploy();

            const defaultVoucherSVG = await descriptor.getProductVoucherSVG(productId);
            expect(defaultVoucherSVG).to.be.not.null;
            expect(await descriptor.getProductVoucherSVG(productId + 1)).to.equal(defaultVoucherSVG);

            await expect(descriptor.connect(owner).setProductVoucherSVG(productId, voucherSVG.address)).to.be.revertedWith("not operator");

            await descriptor.connect(operator).setProductVoucherSVG(productId, voucherSVG.address);
            expect(await descriptor.getProductVoucherSVG(productId)).to.equal(voucherSVG.address);
            expect(await descriptor.getProductVoucherSVG(productId + 1)).to.equal(defaultVoucherSVG);
            expect(await descriptor.voucherSVG(tokenId)).to.equal(voucherSVG.address);
        });
    });

    describe('metadata', function () {
        it('product center info', async function () {
            const name = "Longfil Lab";
            const desc = "The Longfil Lab";
            const link = "www.longfil.io";
            await expect(descriptor.connect(operator).setProductCenterInfo(productCenter.address, { name, desc, link })).to.be.revertedWith("not admin");
            await descriptor.connect(owner).setProductCenterInfo(productCenter.address, { name, desc, link });

            const metadata = await descriptor.slotMetadata(productId);
            const productCenterNameAttr = metadata.attributes[0];
            expect(productCenterNameAttr.name).to.equal("product_center");
            expect(productCenterNameAttr.desc).to.equal("product center name");
            expect(productCenterNameAttr.value).to.equal(name);

            const productCenterContractAttr = metadata.attributes[1];
            expect(productCenterContractAttr.name).to.equal("product_center_contract");
            expect(productCenterContractAttr.desc).to.equal("contract address of product center");
            expect(productCenterContractAttr.value).to.equal(productCenter.address.toLowerCase());
        });
        it('product info', async function () {
            const name = "product no.1";
            const desc = "Fixed rate product no.1";
            const link = "www.longfil.io/1";
            await descriptor.connect(operator).setProductInfo(productId, { name, desc, link });

            const metadata = await descriptor.slotMetadata(productId);
            expect(metadata.name).to.equal(name);
            expect(metadata.desc).to.equal(desc);
            expect(metadata.link).to.equal(link);
        });

        it('product stage', async function () {
            const product2 = 2;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 2, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 2, 100, interestRate.address);
            await productCenter.connect(operator).create(product2, parameters);

            let metadata = await descriptor.slotMetadata(product2);
            let productStageAttr = metadata.attributes[2];
            expect(productStageAttr.name).to.equal("product_stage");
            expect(productStageAttr.desc).to.equal("stage of product");
            expect(productStageAttr.value).to.equal("PRE_SUBSCRIPTION");

            let nowAPRAttr = metadata.attributes[3];
            expect(nowAPRAttr.name).to.equal("APR");
            expect(nowAPRAttr.value).to.equal("0%");
            console.log(await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address));

            // fastup
            helpers.mine(2);
            metadata = await descriptor.slotMetadata(product2);
            productStageAttr = metadata.attributes[2];
            expect(productStageAttr.value).to.equal("SUBSCRIPTION");

            nowAPRAttr = metadata.attributes[3];
            expect(nowAPRAttr.value).to.equal("0%");
            console.log(await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address));

            // fastup
            helpers.mine(MIN_SUBSCRIPTION_PERIOD);
            metadata = await descriptor.slotMetadata(product2);
            productStageAttr = metadata.attributes[2];
            expect(productStageAttr.value).to.equal("ONLINE");

            nowAPRAttr = metadata.attributes[3];
            expect(nowAPRAttr.value).to.equal("10%");
            console.log(await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address));
        });

        it('is redeemable', async function () {
            let metadata = await descriptor.tokenMetadata(tokenId);
            let isRedeemableAttr = metadata.attributes[7];
            expect(isRedeemableAttr.name).to.equal("is_redeemable");
            expect(isRedeemableAttr.desc).to.equal("redeemable or not at present");
            expect(isRedeemableAttr.value).to.equal("false");

            // fastup
            helpers.mine(MIN_SUBSCRIPTION_PERIOD + 100);

            metadata = await descriptor.tokenMetadata(tokenId);
            isRedeemableAttr = metadata.attributes[7];
            expect(isRedeemableAttr.value).to.equal("true");
        });

        it('product center helper', async function () {
            const name = "product no.1";
            const desc = "Fixed rate product no.1";
            const link = "www.longfil.io/1";
            await descriptor.connect(operator).setProductInfo(productId, { name, desc, link });

            const [parameters, metadata] = await productCenterHelper.getProductInfo(productId);
            console.log(JSON.stringify(parameters))
            console.log(metadata)

            console.log(await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address));
        });
    });
});