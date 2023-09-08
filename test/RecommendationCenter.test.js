const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
// const { deployMockContract } = waffle;

const MIN_SUBSCRIPTION_PERIOD = 2880;
const MAX_SUBSCRIPTION_PERIOD = 2880 * 28;

const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const MANTISSA_ONE = ethers.utils.parseEther("1");
const DEFAULT_REFERRER_EARNINGS_RATIO = ethers.utils.parseEther("0.2");

const EARNINGS_VOUCHER_SLOT_ID = 23;

var SETTLEMENT_ABI = [ "event Settlement(address indexed referrer, uint256 indexed productId, uint256 oldTotalEquities, uint256 newTotalEquities, uint256 oldSettledInterest, uint256 newSettledInterest)" ];
var SETTLEMENT_INTERFACE = new ethers.utils.Interface(SETTLEMENT_ABI);
var DISTRIBUTED_EARNINGS_ABI = [ "event DistributedEarningsChanged(address indexed referrer, uint256 oldDistributedEarnings, uint256 newDistributedEarnings)" ];
var DISTRIBUTED_EARNINGS_INTERFACE = new ethers.utils.Interface(DISTRIBUTED_EARNINGS_ABI);

function calculateEarnings(unsettledInterest, referrerEaringsRatioMantissa) {
    return unsettledInterest.mul(referrerEaringsRatioMantissa).div(MANTISSA_ONE);
}

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

describe('RecommendationCenter', function () {
    let owner, operator, referrer1, referral1, referrer2, referral2;
    let longVoucher, productCenter, interestRate, recommendation, recommendationCenter;

    async function bind(referrer, referral) {
        const domain = {
            name: "LongFil Voucher",
            version: "1",
            chainId: 31337,
            verifyingContract: recommendation.address
        };
        // console.log(domain)
        const types = {
            Referral: [
                { name: 'referrer', type: 'address' },
                { name: 'deadline', type: 'uint256' },
            ],
        };

        const data = {
            referrer: referrer.address,
            deadline: (await helpers.time.latest() + 3600)
        };

        let signature = await referral._signTypedData(domain, types, data);
        signature = signature.substring(2);
        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = parseInt(signature.substring(128, 130), 16);

        // normal
        await recommendation.bind(data.referrer, data.deadline, v, r, s);
        expect((await recommendation.getReferralInfo(referral.address))[0]).to.be.true;
    }

    beforeEach(async () => {
        [owner, operator, referrer1, referral1, referrer2, referral2] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongVoucher", 18, owner.address);

        const recommendationFactory = await ethers.getContractFactory('Recommendation');
        recommendation = await recommendationFactory.deploy();
        await longVoucher.connect(owner).addSlotManager(recommendation.address, [20]);
        await recommendation.initialize(longVoucher.address, 20, owner.address); 

        const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
        recommendationCenter = await recommendationCenterFactory.deploy();
        await longVoucher.connect(owner).addSlotManager(recommendationCenter.address, [EARNINGS_VOUCHER_SLOT_ID]);
        await recommendationCenter.initialize(longVoucher.address, recommendation.address, EARNINGS_VOUCHER_SLOT_ID, owner.address);

        const filForwarderFactory = await ethers.getContractFactory('TestOnlyFilForwarder');
        const filForwarder = await filForwarderFactory.deploy();

        const productCenterFactory = await ethers.getContractFactory('ProductCenter');
        productCenter = await productCenterFactory.deploy();
        await productCenter.initialize(longVoucher.address, recommendationCenter.address, filForwarder.address, owner.address);

        const interestRateFactory = await ethers.getContractFactory('TestOnlyInterestRate');
        interestRate = await interestRateFactory.deploy();

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);

        recommendationCenter.connect(owner).addConsumer(productCenter.address, DEFAULT_REFERRER_EARNINGS_RATIO);

        // 
        await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);

        // grant referrer qualification
        await recommendation.mint(referrer1.address);
        await recommendation.mint(referrer2.address);
    });

    describe('initialization', function () {
        it('initialization', async function () {
            expect(await recommendationCenter.longVoucher()).to.equal(longVoucher.address);
            expect(await recommendationCenter.recommendation()).to.equal(recommendation.address);
            expect(await recommendationCenter.referrerEarningsSlot()).to.equal(EARNINGS_VOUCHER_SLOT_ID);
            expect(await recommendationCenter.owner()).to.equal(owner.address);
            expect(await recommendationCenter.consumerCount()).to.equal(1);
            expect(await recommendationCenter.consumerByIndex(0)).to.equal(productCenter.address);
            expect(await recommendationCenter.getReferrerEarningsRatio(productCenter.address)).to.equal(DEFAULT_REFERRER_EARNINGS_RATIO);
            expect(await longVoucher.managerOf(EARNINGS_VOUCHER_SLOT_ID)).to.equal(recommendationCenter.address);

        });
    });

    describe('addConsumer', function () {
        it('addConsumer', async function () {
            await expect(recommendationCenter.connect(referral1).addConsumer(referral1.address, DEFAULT_REFERRER_EARNINGS_RATIO)).be.revertedWith("Ownable: caller is not the owner");
            await expect(recommendationCenter.connect(owner).addConsumer(ethers.constants.AddressZero, DEFAULT_REFERRER_EARNINGS_RATIO)).be.revertedWith("zero address");
            await expect(recommendationCenter.connect(owner).addConsumer(productCenter.address, DEFAULT_REFERRER_EARNINGS_RATIO)).be.revertedWith("consumer exists");
            await expect(recommendationCenter.connect(owner).addConsumer(referral1.address, ethers.utils.parseEther("1.1"))).be.revertedWith("illegal referrer earnings ratio");

            const tx = await recommendationCenter.connect(owner).addConsumer(referral1.address, DEFAULT_REFERRER_EARNINGS_RATIO);
            const receipt = await tx.wait();

            let addedConsumerEvent = receipt.events[0];
            expect(addedConsumerEvent.event).to.equal("AddedConsumer");
            expect(addedConsumerEvent.args.consumer).to.equal(referral1.address);
            expect(addedConsumerEvent.args.referrerEarningsRatio).to.equal(DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.isConsumer(referral1.address)).to.be.true;
        });
    });

    describe('track', function () {
        it('bind before subscribe', async function () {
            // 建立推荐关系
            await bind(referrer1, referral1);

            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            const tx = await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const receipt = await tx.wait();

            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            let tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            let settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[3]);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(0);
            expect(settlementEvent.args.newTotalEquities).to.equal(tokenBalance);
            expect(settlementEvent.args.oldSettledInterest).to.equal(0);
            expect(settlementEvent.args.newSettledInterest).to.equal(0);

            // -----------------------

            // fast up , still in subscription stage
            await helpers.mine(5);

            // 认购期内不计利息
            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(1);
            expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(0);

            // -----------------------

            // fast up, into online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 20);

            // token 总利息
            let tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            let unsettledInterest = tokenInterest;
            // 累计收益
            let accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(1);
            expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(accruedEarnings);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(accruedEarnings);

        });

        it('bind after subscribe', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            let tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // 推荐关系尚未建立，referrer1没有推荐数据
            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(0);

            // -------------------
            // fastup 20
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 20);

            // 建立推荐关系
            await bind(referrer1, referral1);
            const [, referralInfo1] = await recommendation.getReferralInfo(referral1.address);
            // console.log(referralInfo1);

            // 尚未追踪到 token
            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(0);


            // -------------------

            // 通过转账触发追踪到token
            let tx = await (longVoucher.connect(referral1)['transferFrom(uint256,address,uint256)'](tokenId, referrer1.address, 0));
            let receipt = await tx.wait();

            // 计息开始区块至绑定推荐关系区块期间的利息，这部分是应该扣除的利息
            const deductionInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                referralInfo1.bindAt
            );
            // token 总利息
            let tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            let unsettledInterest = tokenInterest.sub(deductionInterest);
            // 累计收益
            let accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(1);
            expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(deductionInterest);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(accruedEarnings);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(accruedEarnings);

            let settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[4]);
            expect(settlementEvent.args.referrer).to.equal(referrer1.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(0);
            expect(settlementEvent.args.newTotalEquities).to.equal(tokenBalance);
            expect(settlementEvent.args.oldSettledInterest).to.equal(0);
            expect(settlementEvent.args.newSettledInterest).to.equal(deductionInterest);

            // --------------------------------------
            // 暂存转账发生前的已清算利息
            let previousSettledInterest = await recommendationCenter.getSettledInterest(referrer1.address, productId);

            // 再过1个区块
            // fastup 1
            await helpers.mine(1);

            // 由于没有transfer发生，没有触发清算，所以已清算的利息保持不变
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(previousSettledInterest);

            // token 总利息
            tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            unsettledInterest = tokenInterest.sub(previousSettledInterest);
            // 累计收益
            accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(accruedEarnings);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(accruedEarnings);

            // --------------------------------------

            // 暂存转账发生前的已清算利息
            previousSettledInterest = await recommendationCenter.getSettledInterest(referrer1.address, productId);

            // 转账触发清算
            let transferValue = ethers.utils.parseEther("1");
            tx = await (longVoucher.connect(referral1)['transferFrom(uint256,address,uint256)'](tokenId, referrer1.address, transferValue));
            receipt = await tx.wait();

            tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // 转出部分权益自计息开始区块至绑定推荐关系区块期间的利息
            let valueInterest = await interestRate.calculate(
                transferValue,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 区间较短
            expect(valueInterest).be.lt(previousSettledInterest);
            // 关联的权益总额减少了
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
            // 转出时截留利息，截留的利息优先递减已清算金额，再有多余才会直接分配
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(previousSettledInterest.sub(valueInterest));

            settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[4]);
            expect(settlementEvent.args.referrer).to.equal(referrer1.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(tokenBalance.add(transferValue));
            expect(settlementEvent.args.newTotalEquities).to.equal(tokenBalance);
            expect(settlementEvent.args.oldSettledInterest).to.equal(previousSettledInterest);
            expect(settlementEvent.args.newSettledInterest).to.equal(previousSettledInterest.sub(valueInterest));

            // token 总利息
            tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            unsettledInterest = tokenInterest.sub(previousSettledInterest.sub(valueInterest));
            // 累计收益
            accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(accruedEarnings);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(accruedEarnings);

            // --------------------------------------

            // 暂存转账发生前的已清算利息
            previousSettledInterest = await recommendationCenter.getSettledInterest(referrer1.address, productId);
            // 转账触发清算,转出大部分剩余的权益
            transferValue = ethers.utils.parseEther("8");
            tx = await (longVoucher.connect(referral1)['transferFrom(uint256,address,uint256)'](tokenId, referrer1.address, transferValue));
            receipt = await tx.wait();
            // console.log(receipt)

            tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // 转出部分权益自计息开始区块至绑定推荐关系区块期间的利息
            valueInterest = await interestRate.calculate(
                transferValue,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 金额较大，转出部分权益累计的利息大于之前的已清算利息了
            expect(valueInterest).be.gt(previousSettledInterest);
            // 关联的权益总额减少了
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
            // 转出时截留利息，截留的利息优先递减已清算金额，再有多余才会直接分配
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);

            // 多余部分， 直接分配收益
            const distributedEarnings = calculateEarnings(valueInterest.sub(previousSettledInterest), DEFAULT_REFERRER_EARNINGS_RATIO);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(distributedEarnings);

            let distributedEaringsEvent = DISTRIBUTED_EARNINGS_INTERFACE.parseLog(receipt.events[4]);
            expect(distributedEaringsEvent.args.referrer).to.equal(referrer1.address);
            expect(distributedEaringsEvent.args.oldDistributedEarnings).to.equal(0);
            expect(distributedEaringsEvent.args.newDistributedEarnings).to.equal(distributedEarnings);

            settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[5]);
            expect(settlementEvent.args.referrer).to.equal(referrer1.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(tokenBalance.add(transferValue));
            expect(settlementEvent.args.newTotalEquities).to.equal(tokenBalance);
            expect(settlementEvent.args.oldSettledInterest).to.equal(previousSettledInterest);
            expect(settlementEvent.args.newSettledInterest).to.equal(0);

            // token 总利息
            tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            unsettledInterest = tokenInterest.sub(0);
            // 未清算利息的收益
            accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);
            // 总累计收益 = 未清算利息的收益 + 已分配收益
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(accruedEarnings.add(distributedEarnings));
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(accruedEarnings);

            // ----------------------

            // 再转出, 累计 distributedEarnings
            // 暂存转账发生前的已清算利息
            previousSettledInterest = await recommendationCenter.getSettledInterest(referrer1.address, productId);

            // 转账触发清算,转出大部分剩余的权益
            transferValue = ethers.utils.parseEther("1");
            tx = await (longVoucher.connect(referral1)['transferFrom(uint256,address,uint256)'](tokenId, referrer1.address, transferValue));
            receipt = await tx.wait();

            tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // 转出部分权益自计息开始区块至绑定推荐关系区块期间的利息
            valueInterest = await interestRate.calculate(
                transferValue,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );

            // 多余部分， 直接分配收益
            const addedDistributedEarnings = calculateEarnings(valueInterest.sub(previousSettledInterest), DEFAULT_REFERRER_EARNINGS_RATIO);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(distributedEarnings.add(addedDistributedEarnings));

            distributedEaringsEvent = DISTRIBUTED_EARNINGS_INTERFACE.parseLog(receipt.events[4]);
            expect(distributedEaringsEvent.args.referrer).to.equal(referrer1.address);
            expect(distributedEaringsEvent.args.oldDistributedEarnings).to.equal(distributedEarnings);
            expect(distributedEaringsEvent.args.newDistributedEarnings).to.equal(distributedEarnings.add(addedDistributedEarnings));

            settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[5]);
            expect(settlementEvent.args.referrer).to.equal(referrer1.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(tokenBalance.add(transferValue));
            expect(settlementEvent.args.newTotalEquities).to.equal(tokenBalance);
            expect(settlementEvent.args.oldSettledInterest).to.equal(previousSettledInterest);
            expect(settlementEvent.args.newSettledInterest).to.equal(0);
        });

        it('subscribe-bind-subscribe', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });

            // 建立推荐关系
            await bind(referrer1, referral1);

            // subsribe again
            await productCenter.connect(referral1).subscribe(productId, { value: principal });

            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            let tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            expect(tokenBalance).be.gt(principal.mul(2));
            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(1);
            expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
        });

        it('burn in subscription', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            const tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            // expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);

            // 建立推荐关系
            await bind(referrer1, referral1);

            // burn
            await longVoucher.connect(referral1).burn(tokenId);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            // expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);
        });

        it('burn online 1', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            const tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            // expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);

            // 建立推荐关系
            await bind(referrer1, referral1);

            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 100);

            // burn
            await longVoucher.connect(referral1).burn(tokenId);

            const interest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );

            const distributedEarnings = calculateEarnings(interest, DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            // expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(distributedEarnings);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);
        });

        it('burn online 2', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            const tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            // expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);

            // fastup to online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 100);

            // 建立推荐关系
            await bind(referrer1, referral1);

            const [, referralInfo] = await recommendation.getReferralInfo(referral1.address);

            // fastup to online stage
            await helpers.mine(100);

            // burn
            await longVoucher.connect(referral1).burn(tokenId);

            const interest1 = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                referralInfo.bindAt
            );

            const interest2 = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );

            const distributedEarnings = calculateEarnings(interest2.sub(interest1), DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            // expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(distributedEarnings);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);
        });

        it('referral as receiver', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId1 = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);

            // fastup 20 into online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 20);

            // 转一部分给到referral2
            const transferPart1 = ethers.utils.parseEther("2");
            await (longVoucher.connect(referral1)['transferFrom(uint256,address,uint256)'](tokenId1, referral2.address, transferPart1));
            const tokenId2 = await longVoucher.tokenOfOwnerByIndex(referral2.address, 0);

            // fastup 100
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 100);

            // -------------------
            // 建立推荐关系
            await bind(referrer2, referral2);
            const [, referralInfo2] = await recommendation.getReferralInfo(referral2.address);
            // console.log(referralInfo1);

            // 在转一部分给到referral2，触发追踪
            const transferPart2 = ethers.utils.parseEther("3");
            let tx = await (longVoucher.connect(referral1)['transferFrom(uint256,uint256,uint256)'](tokenId1, tokenId2, transferPart2));
            let receipt = await tx.wait();
            // console.log(receipt)

            // transferPart1 计息开始区块至绑定推荐关系区块期间的利息，这部分是应该扣除的利息
            const transferPart1DeductionInterest = await interestRate.calculate(
                transferPart1,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                referralInfo2.bindAt
            );

            // transferPart2 计息开始区块至最新区块间的利息，这部分是应该扣除的利息
            const transferPart2DeductionInterest = await interestRate.calculate(
                transferPart2,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );

            const settledInterest = transferPart1DeductionInterest.add(transferPart2DeductionInterest);

            // token 总利息
            let tokenInterest = await interestRate.calculate(
                transferPart1.add(transferPart2),
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            let unsettledInterest = tokenInterest.sub(settledInterest);
            // 累计收益
            let accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.referredProductCount(referrer2.address)).to.equal(1);
            expect(await recommendationCenter.getDistributedEarnings(referrer2.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer2.address, productId)).to.equal(transferPart1.add(transferPart2));
            expect(await recommendationCenter.getSettledInterest(referrer2.address, productId)).to.equal(settledInterest);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer2.address)).to.equal(accruedEarnings);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer2.address, productId)).to.equal(accruedEarnings);

            let settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[1]);
            expect(settlementEvent.args.referrer).to.equal(referrer2.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(0);
            expect(settlementEvent.args.newTotalEquities).to.equal(transferPart1.add(transferPart2));
            expect(settlementEvent.args.oldSettledInterest).to.equal(0);
            expect(settlementEvent.args.newSettledInterest).to.equal(settledInterest);

            // transfer part 3
            const transferPart3 = ethers.utils.parseEther("1");
            tx = await (longVoucher.connect(referral1)['transferFrom(uint256,uint256,uint256)'](tokenId1, tokenId2, transferPart3));
            receipt = await tx.wait();

            const transferPart3DeductionInterest = await interestRate.calculate(
                transferPart3,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );

            settlementEvent = SETTLEMENT_INTERFACE.parseLog(receipt.events[1]);
            expect(settlementEvent.args.referrer).to.equal(referrer2.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(transferPart1.add(transferPart2));
            expect(settlementEvent.args.newTotalEquities).to.equal(transferPart1.add(transferPart2).add(transferPart3));
            expect(settlementEvent.args.oldSettledInterest).to.equal(settledInterest);
            expect(settlementEvent.args.newSettledInterest).to.equal(settledInterest.add(transferPart3DeductionInterest));

            // 被推荐人转出所有份额，推荐人的涉及产品-1
            await (longVoucher.connect(referral2)['transferFrom(address,address,uint256)'](referral2.address, referral1.address, tokenId2));
            expect(await recommendationCenter.referredProductCount(referrer2.address)).to.equal(0);
        });

        it('trackVoucher', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            let tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // -------------------

            // fastup 20
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 20);
            // 建立推荐关系
            await bind(referrer1, referral1);
            const [, referralInfo1] = await recommendation.getReferralInfo(referral1.address);
            // console.log(referralInfo1);

            // 尚未追踪到 token
            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(0);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(0);

            // -------------------

            // 调用trackVoucher
            await recommendationCenter.connect(referrer1).trackVoucher(tokenId);

            // 计息开始区块至绑定推荐关系区块期间的利息，这部分是应该扣除的利息
            const deductionInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                referralInfo1.bindAt
            );
            // token 总利息
            let tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息
            let unsettledInterest = tokenInterest.sub(deductionInterest);
            // 累计收益
            let accruedEarnings = calculateEarnings(unsettledInterest, DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(await recommendationCenter.referredProductCount(referrer1.address)).to.equal(1);
            expect(await recommendationCenter.referredProductIdByIndex(referrer1.address, 0)).to.equal(productId);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);
            expect(await recommendationCenter.getTotalEquities(referrer1.address, productId)).to.equal(tokenBalance);
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(deductionInterest);
            expect(await recommendationCenter['accruedEarnings(address)'](referrer1.address)).to.equal(accruedEarnings);
            expect(await recommendationCenter['accruedEarnings(address,uint256)'](referrer1.address, productId)).to.equal(accruedEarnings);

            /// 异常场景

            await longVoucher.addSlotManager(referrer2.address, []);
            await longVoucher.connect(referrer2).claimSlot(2);
            await longVoucher.connect(referrer2).mint(referral2.address, 2, ethers.utils.parseEther("1.0"));

            // mint to referral2 
            let newTokenId = await longVoucher.tokenOfOwnerByIndex(referral2.address, 0); 
            await expect(recommendationCenter.connect(referrer1).trackVoucher(newTokenId)).be.be.revertedWith("referral not exists");

            // mint to referral1 
            await longVoucher.connect(referrer2).mint(referral1.address, 2, ethers.utils.parseEther("1.0"));
            newTokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 1); 
            await expect(recommendationCenter.connect(referrer1).trackVoucher(newTokenId)).be.be.revertedWith("illegal consumer");
        });
    });
    describe('claim', function () {
        it('claim distirbuted', async function () {
            // 建立推荐关系
            await bind(referrer1, referral1);

            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(referral1).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referral1.address, 0);
            let tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // -----------------------

            // fast up, into online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 20);
            // 已清算利息为0
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);

            // 转账触发清算
            transferValue = ethers.utils.parseEther("5");
            await (longVoucher.connect(referral1)['transferFrom(uint256,address,uint256)'](tokenId, referrer1.address, transferValue));

            tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // 转出部分权益自计息开始区块至绑定推荐关系区块期间的利息
            valueInterest = await interestRate.calculate(
                transferValue,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 直接分配了，不累计已清算利息
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(0);

            // 多余部分， 直接分配收益
            const distributedEarnings = calculateEarnings(valueInterest, DEFAULT_REFERRER_EARNINGS_RATIO);
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(distributedEarnings);

            let tx = await recommendationCenter.connect(referrer1)['claimEarnings(address)'](referrer1.address);
            let receipt = await tx.wait();

            // console.log(receipt)
            let claimEvent = receipt.events[5];
            expect(claimEvent.event).to.equal("Claimed");
            expect(claimEvent.args.referrer).to.equal(referrer1.address);
            expect(claimEvent.args.earnings).to.equal(distributedEarnings);

            const earningsVoucherId = claimEvent.args.voucherId;
            expect(await longVoucher['balanceOf(uint256)'](earningsVoucherId)).to.equal(distributedEarnings);
            expect(await recommendationCenter.isRedeemable(earningsVoucherId)).to.be.true;
            expect(await recommendationCenter.getRedeemableAmount(earningsVoucherId)).to.equal(distributedEarnings);
            // 已分配收益清零
            expect(await recommendationCenter.getDistributedEarnings(referrer1.address)).to.equal(0);

            // settle product and claim
            // fast up
            await helpers.mine(20);

            tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            tx = await recommendationCenter.connect(referrer1)['claimEarnings(address,uint256[])'](referrer1.address, [productId]);
            receipt = await tx.wait();
            // console.log(receipt)

            let settlementEvent = receipt.events[0];
            expect(settlementEvent.args.referrer).to.equal(referrer1.address);
            expect(settlementEvent.args.productId).to.equal(productId);
            expect(settlementEvent.args.oldTotalEquities).to.equal(tokenBalance);
            expect(settlementEvent.args.newTotalEquities).to.equal(tokenBalance);

            claimEvent = receipt.events[6];
            expect(claimEvent.args.referrer).to.equal(referrer1.address);

            // token 总利息
            tokenInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            // 未清算利息的收益
            accruedEarnings = calculateEarnings(tokenInterest, DEFAULT_REFERRER_EARNINGS_RATIO);

            expect(settlementEvent.args.oldSettledInterest).to.equal(0);
            expect(settlementEvent.args.newSettledInterest).to.equal(tokenInterest);
            expect(claimEvent.args.earnings).to.equal(accruedEarnings);

            // product 的已清算金额累加
            expect(await recommendationCenter.getSettledInterest(referrer1.address, productId)).to.equal(tokenInterest);

        });
    });
    describe('ICashPoolConsumer', function () {
        it('*equitiesTransfer', async function () {
            await expect(recommendationCenter.isRedeemable(1)).be.revertedWith("illegal voucher");
            await expect(recommendationCenter.getRedeemableAmount(1)).be.revertedWith("illegal voucher");
        });
    });

    describe('IRecommendationCenterConsumer', function () {
        it('onEquitiesTransfer', async function () {
            const productId = 1;

            await longVoucher.connect(owner).addSlotManager(referral1.address, []);
            await longVoucher.connect(referral1).claimSlot(productId);
            await longVoucher.connect(referral1).mint(referral1.address, productId, 1);

            await expect(recommendationCenter.connect(referral2).onEquitiesTransfer(
                productId,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                0,
                0,
                0
            )).to.be.revertedWith("illegal product");

            await expect(recommendationCenter.connect(referral1).onEquitiesTransfer(
                productId,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                0,
                0,
                0
            )).to.be.revertedWith("illegal caller");
        });
    });
});