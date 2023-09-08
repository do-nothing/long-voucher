
const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
// const { deployMockContract } = waffle;
const Errors = require("./errors");

const expScale = ethers.utils.parseEther("1").mul(ethers.utils.parseEther("1"));

// 30 secs per block
const BLOCKS_PER_DAY = ethers.BigNumber.from(24).mul(3600).div(30);
const BLOCKS_PER_YEAR = BLOCKS_PER_DAY.mul(365);

// blocks in 120 days
const BLOCKS_120_DAYS = BLOCKS_PER_DAY.mul(120);
// blocks in 240 days
const BLOCKS_240_DAYS = BLOCKS_PER_DAY.mul(240);
// blocks in 360 days
const BLOCKS_360_DAYS = BLOCKS_PER_DAY.mul(360);

// interest rate per block when holding duration < 120 days
const BLOCK_RATE_HOLDING_LE_120 = expScale.mul(5).div(100).div(BLOCKS_PER_YEAR);
// interest rate per block when holding duration < 240 days
const BLOCK_RATE_HOLDING_LE_240 = expScale.mul(7).div(100).div(BLOCKS_PER_YEAR);
// interest rate per block when holding duration < 360 days
const BLOCK_RATE_HOLDING_LE_360 = expScale.mul(9).div(100).div(BLOCKS_PER_YEAR);
// interest rate per block when holding duration >= 360 days
const BLOCK_RATE_HOLDING_GT_360 = expScale.mul(11).div(100).div(BLOCKS_PER_YEAR);

// interest rate in subscription stage
const BLOCK_RATE_SUBSCRIPTION = BLOCK_RATE_HOLDING_LE_120;

describe('TieredInterestRate', function () {
    let interestRate;

    beforeEach(async () => {
        const interestRateFactory = await ethers.getContractFactory('TieredInterestRate');
        interestRate = await interestRateFactory.deploy();
    });

    describe('calculate', function () {
        it('in subscription', async function () {
            const principal = ethers.utils.parseEther("100");
            let nowBlockNumber;
            // await expect(interestRate.calculate(principal, 2, 1, 1, 2)).to.be.revertedWith("illegal block range 1");
            // await expect(interestRate.calculate(principal, 1, 2, 2, 1)).to.be.revertedWith("illegal block range 1");
            nowBlockNumber = (await helpers.time.latestBlock());
            expect(await interestRate.calculate(principal, nowBlockNumber + 1, nowBlockNumber + 2, 1, 2)).to.equal(0);
            expect(await interestRate.nowAPR(nowBlockNumber + 1, nowBlockNumber + 2)).to.equal("0%");

            nowBlockNumber = (await helpers.time.latestBlock());
            await expect(interestRate.calculate(principal, nowBlockNumber, nowBlockNumber + 10, nowBlockNumber - 1, nowBlockNumber + 10)).to.be.revertedWith("illegal block range 1");
            await expect(interestRate.calculate(principal, nowBlockNumber, nowBlockNumber + 10, nowBlockNumber, nowBlockNumber + 12)).to.be.revertedWith("illegal block range 1");

            const blockDelta = 10;
            const interest = principal.mul(BLOCK_RATE_SUBSCRIPTION).mul(blockDelta).div(expScale);

            nowBlockNumber = (await helpers.time.latestBlock());
            expect(await interestRate.calculate(
                principal, nowBlockNumber, nowBlockNumber + blockDelta, nowBlockNumber, nowBlockNumber + blockDelta)
            ).to.equal(interest);
        });

        it('online <= 120 days', async function () {
            let nowBlockNumber;
            let blockDelta = BLOCKS_120_DAYS;
            let principal = ethers.utils.parseEther("100");
            let interest = principal.mul(BLOCK_RATE_HOLDING_LE_120).mul(blockDelta).div(expScale);
            // console.log(interest)
            let endSubscriptionBlock = (await helpers.time.latestBlock());

            await expect(interestRate.calculate(principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock -2, endSubscriptionBlock)).to.be.revertedWith("illegal block range 2");
            await expect(interestRate.calculate(principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, endSubscriptionBlock + 2)).to.be.revertedWith("illegal block range 2");

            // fastup 120 days
            await helpers.mine(blockDelta);
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("5%");

            // new block, now > 120 days
            await helpers.mine(1);
            blockDelta = blockDelta.add(1);
            interest = principal.mul(BLOCK_RATE_HOLDING_LE_240).mul(blockDelta).div(expScale);
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            nowBlockNumber = (await helpers.time.latestBlock());
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("7%");
        });

        it('online <= 240 days', async function () {
            let blockDelta = BLOCKS_240_DAYS;
            let principal = ethers.utils.parseEther("100");
            let interest = principal.mul(BLOCK_RATE_HOLDING_LE_240).mul(blockDelta).div(expScale);
            // console.log(interest)
            let endSubscriptionBlock = (await helpers.time.latestBlock());

            // fastup 240 days
            await helpers.mine(blockDelta);
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("7%");

            // new block, now > 240 days
            await helpers.mine(1);
            blockDelta = blockDelta.add(1);
            interest = principal.mul(BLOCK_RATE_HOLDING_LE_360).mul(blockDelta).div(expScale);
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("9%");
        });

        it('online <= 360 days', async function () {
            let nowBlockNumber;
            let blockDelta = BLOCKS_360_DAYS;
            let principal = ethers.utils.parseEther("100");
            let interest = principal.mul(BLOCK_RATE_HOLDING_LE_360).mul(blockDelta).div(expScale);
            // console.log(interest)
            let endSubscriptionBlock = (await helpers.time.latestBlock());

            // fastup 360 days
            await helpers.mine(blockDelta);
            nowBlockNumber = (await helpers.time.latestBlock());
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("9%");

            // new block, now > 360 days
            await helpers.mine(1);
            blockDelta = blockDelta.add(1);
            interest = principal.mul(BLOCK_RATE_HOLDING_GT_360).mul(blockDelta).div(expScale);
            nowBlockNumber = (await helpers.time.latestBlock());
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("11%");
        });


        it('online > 360 days', async function () {
            let blockDelta = BLOCKS_360_DAYS.add(1);
            let principal = ethers.utils.parseEther("100");
            let interest = principal.mul(BLOCK_RATE_HOLDING_GT_360).mul(blockDelta).div(expScale);
            const endSubscriptionBlock = (await helpers.time.latestBlock());
            // fastup 360 days
            await helpers.mine(blockDelta);
            const nowBlockNumber = (await helpers.time.latestBlock());
            expect(await interestRate.calculate(
                principal, endSubscriptionBlock - 1, endSubscriptionBlock, endSubscriptionBlock, blockDelta.add(endSubscriptionBlock))
            ).to.equal(interest);
            expect(await interestRate.nowAPR(endSubscriptionBlock - 1, endSubscriptionBlock)).to.equal("11%");
        });
    });
});