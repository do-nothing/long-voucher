
const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const VALUE = ethers.utils.parseEther("100000");
const PRODUCT_ID = 1;

// 30 secs per block
const BLOCKS_PER_DAY = ethers.BigNumber.from(24).mul(3600).div(30);
// blocks in 120 days
const BLOCKS_120_DAYS = BLOCKS_PER_DAY.mul(120);
// blocks in 240 days
const BLOCKS_240_DAYS = BLOCKS_PER_DAY.mul(240);
// blocks in 360 days
const BLOCKS_360_DAYS = BLOCKS_PER_DAY.mul(360);


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

describe('VoucherSVG', function () {
    let longVoucher, tokenId;

    beforeEach(async () => {
        [owner, operator] = await ethers.getSigners();

        // await network.provider.send("hardhat_setBalance", [
        //     owner.address,
        //     // '0x1000'
        //     VALUE.add(ethers.utils.parseEther("10")).toString(),
        // ]);
        await helpers.setBalance(owner.address, VALUE.add(ethers.utils.parseEther("10")).toHexString())

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongVoucher", 18, owner.address);

        const recommendationCenterFactory = await ethers.getContractFactory('TestOnlyRecommendationCenter');
        recommendationCenter = await recommendationCenterFactory.deploy();

        const productCenterFactory = await ethers.getContractFactory('ProductCenter');
        productCenter = await productCenterFactory.deploy();
        await productCenter.initialize(longVoucher.address, recommendationCenter.address, owner.address);

        const svgFactory = await ethers.getContractFactory('VoucherSVG');
        svg = await svgFactory.deploy(longVoucher.address);

        const interestRateFactory = await ethers.getContractFactory('TieredInterestRate');
        interestRate = await interestRateFactory.deploy();

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);

        await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);

        // create product
        const nowBlockNumer = await helpers.time.latestBlock();
        const parameters = newProductParameters(
            ethers.utils.parseEther("1000000"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + 11, 100, interestRate.address);
        await productCenter.connect(operator).create(PRODUCT_ID, parameters);
        // console.log(await productCenter.getProductParameters(PRODUCT_ID));

        // subscribe
        await productCenter.connect(owner).subscribe(PRODUCT_ID, { value: VALUE });

        // get token Id
        tokenId = await longVoucher.tokenOfOwnerByIndex(owner.address, 0);
    });

    describe('test', function () {
        it('test', async function () {
            // await helpers.mine(1000)
            console.log(ethers.utils.toUtf8String(await svg.generateSVG(tokenId)))
        });

    });
});