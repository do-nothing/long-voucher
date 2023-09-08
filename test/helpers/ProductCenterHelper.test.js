const { expect, assert } = require('chai');
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const MIN_SUBSCRIPTION_PERIOD = 2880;

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
    };
}

describe('ProductCenterHelper', function () {
    let owner, operator, longVoucher, productCenter, interestRate, productCenterHelper;

    beforeEach(async () => {
        [owner, operator] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongFil", 18, owner.address);

        const recommendationCenterFactory = await ethers.getContractFactory('TestOnlyRecommendationCenter');
        const recommendationCenter = await recommendationCenterFactory.deploy();

        const filForwarderFactory = await ethers.getContractFactory('TestOnlyFilForwarder');
        const filForwarder = await filForwarderFactory.deploy();

        const productCenterFactory = await ethers.getContractFactory('ProductCenter');
        productCenter = await productCenterFactory.deploy();
        await productCenter.initialize(longVoucher.address, recommendationCenter.address, filForwarder.address, owner.address);

        const interestRateFactory = await ethers.getContractFactory('TestOnlyInterestRate');
        interestRate = await interestRateFactory.deploy();

        const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
        productCenterHelper = await productCenterHelperFactory.deploy(longVoucher.address);

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);
        await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
    });

    describe('getProductIdsIn*Stage', function () {
        it('getProductIdsIn*Stage', async function () {
            // create product 1
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(1, parameters);

            // create product 2
            parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 11, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 11, 0, interestRate.address);
            await productCenter.connect(operator).create(2, parameters);

            // create product 3
            parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 21, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 21, 0, interestRate.address);
            await productCenter.connect(operator).create(3, parameters);

            let productIdsAll = await productCenterHelper.getProductIdsAll(productCenter.address);
            // console.log(productIdsAll);
            expect(productIdsAll.length).to.equal(3)
            expect(productIdsAll[0]).to.equal(3);
            expect(productIdsAll[1]).to.equal(2);
            expect(productIdsAll[2]).to.equal(1);

            let productIdsPre = await productCenterHelper.getProductIdsInPreSubscriptionStage(productCenter.address);
            // console.log(productIdsPre);
            expect(productIdsPre.length).to.equal(2)
            expect(productIdsPre[0]).to.equal(3);
            expect(productIdsPre[1]).to.equal(2);

            let productIdsIn = await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address);
            // console.log(productIdsIn);
            expect(productIdsIn.length).to.equal(1)
            expect(productIdsIn[0]).to.equal(1);

            let productIdsOnline = await productCenterHelper.getProductIdsInOnlineStage(productCenter.address);
            // console.log(productIdsOnline);
            expect(productIdsOnline.length).to.equal(0)

            // fast up 10 
            await helpers.mine(10)

            productIdsAll = await productCenterHelper.getProductIdsAll(productCenter.address);
            // console.log(productIdsAll);
            expect(productIdsAll.length).to.equal(3)
            expect(productIdsAll[0]).to.equal(3);
            expect(productIdsAll[1]).to.equal(2);
            expect(productIdsAll[2]).to.equal(1);

            productIdsPre = await productCenterHelper.getProductIdsInPreSubscriptionStage(productCenter.address);
            // console.log(productIdsPre);
            expect(productIdsPre.length).to.equal(1)
            expect(productIdsPre[0]).to.equal(3);

            productIdsIn = await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address);
            // console.log(productIdsIn);
            expect(productIdsIn.length).to.equal(1)
            expect(productIdsIn[0]).to.equal(2);

            productIdsOnline = await productCenterHelper.getProductIdsInOnlineStage(productCenter.address);
            // console.log(productIdsOnline);
            expect(productIdsOnline.length).to.equal(1)
            expect(productIdsOnline[0]).to.equal(1);

            // fast up 10 
            await helpers.mine(10)

            productIdsAll = await productCenterHelper.getProductIdsAll(productCenter.address);
            // console.log(productIdsAll);
            expect(productIdsAll.length).to.equal(3)
            expect(productIdsAll[0]).to.equal(3);
            expect(productIdsAll[1]).to.equal(2);
            expect(productIdsAll[2]).to.equal(1);

            productIdsPre = await productCenterHelper.getProductIdsInPreSubscriptionStage(productCenter.address);
            // console.log(productIdsPre);
            expect(productIdsPre.length).to.equal(0)

            productIdsIn = await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address);
            // console.log(productIdsIn);
            expect(productIdsIn.length).to.equal(1)
            expect(productIdsIn[0]).to.equal(3);

            productIdsOnline = await productCenterHelper.getProductIdsInOnlineStage(productCenter.address);
            // console.log(productIdsOnline);
            expect(productIdsOnline.length).to.equal(2)
            expect(productIdsOnline[0]).to.equal(2);
            expect(productIdsOnline[1]).to.equal(1);

            // fast up 10
            await helpers.mine(10)

            productIdsAll = await productCenterHelper.getProductIdsAll(productCenter.address);
            // console.log(productIdsAll);
            expect(productIdsAll.length).to.equal(3)
            expect(productIdsAll[0]).to.equal(3);
            expect(productIdsAll[1]).to.equal(2);
            expect(productIdsAll[2]).to.equal(1);

            productIdsPre = await productCenterHelper.getProductIdsInPreSubscriptionStage(productCenter.address);
            // console.log(productIdsPre);
            expect(productIdsPre.length).to.equal(0)

            productIdsIn = await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address);
            // console.log(productIdsIn);
            expect(productIdsIn.length).to.equal(0)

            productIdsOnline = await productCenterHelper.getProductIdsInOnlineStage(productCenter.address);
            // console.log(productIdsOnline);
            expect(productIdsOnline.length).to.equal(3)
            expect(productIdsOnline[0]).to.equal(3);
            expect(productIdsOnline[1]).to.equal(2);
            expect(productIdsOnline[2]).to.equal(1);
        });
    });

    describe('getProductIdsBySubscriber', function () {
        it('getProductIdsBySubscriber', async function () {
            // create product 1
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + 11, 0, interestRate.address);
            await productCenter.connect(operator).create(1, parameters);

            // create product 2
            parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 2, nowBlockNumer + 11, 0, interestRate.address);
            await productCenter.connect(operator).create(2, parameters);

            // subscribe product 1
            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(operator).subscribe(1, { value: principal });

            let productIds = await productCenterHelper.getProductIdsBySubscriber(productCenter.address, operator.address);
            // console.log(productIds)
            expect(productIds.length).to.equal(1)
            expect(productIds[0]).to.equal(1);

            // subscribe product 2
            await productCenter.connect(operator).subscribe(2, { value: principal });
            productIds = await productCenterHelper.getProductIdsBySubscriber(productCenter.address, operator.address);
            // console.log(productIds)
            expect(productIds.length).to.equal(2)
            expect(productIds[0]).to.equal(2);
            expect(productIds[1]).to.equal(1);
        });
    });
});