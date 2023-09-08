const { expect } = require('chai');
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const Errors = require("./errors");

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
        cashPool: ethers.constants.AddressZero
    };
}

describe('SimpleCashPool', function () {
    const productId = 1;
    let owner, operator, subscriber, longVoucher, productCenter, interestRate, cashPool;

    beforeEach(async () => {
        [owner, operator, subscriber] = await ethers.getSigners();

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

        const cashPoolFactory = await ethers.getContractFactory('SimpleCashPool');
        cashPool = await cashPoolFactory.deploy();
        await cashPool.initialize(longVoucher.address, filForwarder.address, owner.address);

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);
        await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
    });

    describe('initialization', function () {
        it('initialization', async function () {
            expect(await cashPool.longVoucher()).to.equal(longVoucher.address);
            expect(await cashPool.owner()).to.equal(owner.address);
        });
    });

    describe('admin functions', function () {
        it('addProduct/RemoveProduct', async function () {
            const productId1 = 1;
            const productId2 = 2;
            await expect(cashPool.connect(subscriber).addProduct(productId1)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(cashPool.addProduct(productId1)).to.be.revertedWith(Errors.SLOT_NOT_EXISTS);

            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            const parameters1 = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId1, parameters1);

            nowBlockNumer = await helpers.time.latestBlock();
            const parameters2 = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            await productCenter.connect(operator).create(productId2, parameters2);

            // check before add
            expect(await cashPool.isSupported(productId1)).to.be.false;
            await expect(cashPool.getRedeemedEquities(productId1)).to.be.revertedWith("unsupported product");
            await expect(cashPool.getRedeemedAmount(productId1)).to.be.revertedWith("unsupported product");

            // add
            let tx = await cashPool.addProduct(productId1);
            let receipt = await tx.wait();

            let event = receipt.events[0];
            expect(event.event).to.equal("AddedProduct");
            expect(event.args.productId).to.equal(productId1);

            expect(await cashPool.isSupported(productId1)).to.be.true;
            expect(await cashPool.getRedeemedEquities(productId1)).to.equal(0);
            expect(await cashPool.getRedeemedAmount(productId1)).to.equal(0);
            expect(await cashPool.productCount()).to.equal(1);
            expect(await cashPool.productIdByIndex(0)).to.equal(productId1);

            // add again should fail
            await expect(cashPool.addProduct(productId1)).to.be.revertedWith("already supported");

            // add productId2 should work
            await cashPool.addProduct(productId2);
            expect(await cashPool.productCount()).to.equal(2);
            expect(await cashPool.productIdByIndex(0)).to.equal(productId1);
            expect(await cashPool.productIdByIndex(1)).to.equal(productId2);

            // remove
            await expect(cashPool.connect(subscriber).removeProduct(productId1)).to.be.revertedWith("Ownable: caller is not the owner");
            tx = await cashPool.removeProduct(productId1);
            receipt = await tx.wait();

            event = receipt.events[0];
            expect(event.event).to.equal("RemovedProduct");
            expect(event.args.productId).to.equal(productId1);
            expect(event.args.redeemedEquities).to.equal(0);
            expect(event.args.redeemedAmount).to.equal(0);

            expect(await cashPool.isSupported(productId1)).to.be.false;
            await expect(cashPool.getRedeemedEquities(productId1)).to.be.revertedWith("unsupported product");
            await expect(cashPool.getRedeemedAmount(productId1)).to.be.revertedWith("unsupported product");
            expect(await cashPool.productCount()).to.equal(1);
            expect(await cashPool.productIdByIndex(0)).to.equal(productId2);
        });
    });

    describe('view functions', function () {
        it('getCash', async function () {
            const cash = ethers.utils.parseEther("100");
            const tx = await owner.sendTransaction({ to: cashPool.address, value: cash });
            const receipt = await tx.wait();
            // console.log(receipt)
            // const rechargeEvent = receipt.logs[0];
            // console.log(rechargeEvent)
            // expect(rechargeEvent.args.from).to.equal(owner.address);
            // expect(rechargeEvent.args.amount).to.equal(cash);

            await helpers.setBalance(cashPool.address, cash.toHexString())
            expect(await cashPool.getCash()).to.equal(cash);
        });
    });

    describe('state functions', function () {
        it('redeem', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            const principal = ethers.utils.parseEther("100.0");
            await productCenter.connect(operator).create(productId, parameters);
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            const tokenId1 = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            const token1Balance = await longVoucher['balanceOf(uint256)'](tokenId1);

            // await expect(cashPool.redeem(productId, 0x0)).to.be.revertedWith("zero address");
            await expect(cashPool.redeem(productId, operator.address)).to.be.revertedWith("not owner");

            await expect(cashPool.connect(subscriber).redeem(tokenId1, operator.address)).to.be.revertedWith("unsupported product");

            // add product
            await cashPool.addProduct(productId);
            await expect(cashPool.connect(subscriber).redeem(tokenId1, operator.address)).to.be.revertedWith("not redeemable");

            // fastup to online
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 1000);
            await expect(cashPool.connect(subscriber).redeem(tokenId1, operator.address)).to.be.revertedWith("insufficient balance");

            const cash = ethers.utils.parseEther("1000");
            await helpers.setBalance(cashPool.address, cash.toHexString())

            // not approved
            await expect(cashPool.connect(subscriber).redeem(tokenId1, operator.address)).to.be.revertedWith(Errors.NOT_OWNER_NOR_APPROVED);

            // approve
            await longVoucher.connect(subscriber)['approve(address,uint256)'](cashPool.address, tokenId1);

            const prevOperatorBalance = await ethers.provider.getBalance(operator.address);
            let tx = await cashPool.connect(subscriber).redeem(tokenId1, operator.address);
            let receipt = await tx.wait();
            // console.log(receipt)

            const token1Interest = await interestRate.calculate(
                token1Balance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            const redeemedAmount = token1Balance.add(token1Interest);

            let event = receipt.events[3];
            expect(event.event).to.equal("Redemption");
            expect(event.args.productId).to.equal(productId);
            expect(event.args.voucherId).to.equal(tokenId1);
            expect(event.args.equities).to.equal(token1Balance);
            expect(event.args.amount).to.equal(redeemedAmount);

            // check cash
            expect(await cashPool.getCash()).to.equal(cash.sub(redeemedAmount));
            expect(await ethers.provider.getBalance(operator.address)).to.equal(prevOperatorBalance.add(redeemedAmount));
            // token1 has been burned
            await expect(longVoucher.ownerOf(tokenId1)).to.be.revertedWith(Errors.INVALID_TOKEN_ID);

            const totalRedeemedEquities = await cashPool.getRedeemedEquities(productId);
            const totalRedeemedAmount = await cashPool.getRedeemedAmount(productId);

            expect(totalRedeemedEquities).to.equal(token1Balance);
            expect(totalRedeemedAmount).to.equal(redeemedAmount);

            // remove product
            tx = await cashPool.removeProduct(productId);
            receipt = await tx.wait();

            event = receipt.events[0];
            expect(event.event).to.equal("RemovedProduct");
            expect(event.args.productId).to.equal(productId);
            expect(event.args.redeemedEquities).to.equal(totalRedeemedEquities);
            expect(event.args.redeemedAmount).to.equal(totalRedeemedAmount);
        });

        it('onERC721Received', async function () {
            const productId = 1;
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 0, interestRate.address);
            const principal = ethers.utils.parseEther("100.0");
            await productCenter.connect(operator).create(productId, parameters);
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            const tokenId1 = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            const token1Balance = await longVoucher['balanceOf(uint256)'](tokenId1);

            await expect(longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256,bytes)'](subscriber.address, cashPool.address, tokenId1, operator.address)).to.be.revertedWith(Errors.TRANSFORM_CONTROL);

            // fastup to online
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 1000);
            await expect(longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256,bytes)'](subscriber.address, cashPool.address, tokenId1, operator.address)).to.be.revertedWith("unsupported product");

            // add product
            await cashPool.addProduct(productId);
            await expect(longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256,bytes)'](subscriber.address, cashPool.address, tokenId1, operator.address)).to.be.revertedWith("insufficient balance");

            const cash = ethers.utils.parseEther("1000");
            await helpers.setBalance(cashPool.address, cash.toHexString())

            const prevOperatorBalance = await ethers.provider.getBalance(operator.address);
            let tx = await longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256,bytes)'](subscriber.address, cashPool.address, tokenId1, operator.address);
            let receipt = await tx.wait();
            // console.log(receipt)

            const token1Interest = await interestRate.calculate(
                token1Balance,
                parameters.beginSubscriptionBlock,
                parameters.endSubscriptionBlock,
                parameters.endSubscriptionBlock,
                await helpers.time.latestBlock()
            );
            const redeemedAmount = token1Balance.add(token1Interest);

            let redemptionEvent = receipt.events[5];
            // console.log(redemptionEvent)
            // expect(event.event).to.equal("Redemption");
            expect(utils. redemptionEvent.args.productId).to.equal(productId);
            expect(redemptionEvent.args.voucherId).to.equal(tokenId1);
            expect(redemptionEvent.args.equities).to.equal(token1Balance);
            expect(redemptionEvent.args.amount).to.equal(redeemedAmount);

            // check cash
            expect(await cashPool.getCash()).to.equal(cash.sub(redeemedAmount));
            expect(await ethers.provider.getBalance(operator.address)).to.equal(prevOperatorBalance.add(redeemedAmount));
            // token1 has been burned
            await expect(longVoucher.ownerOf(tokenId1)).to.be.revertedWith(Errors.INVALID_TOKEN_ID);

            const totalRedeemedEquities = await cashPool.getRedeemedEquities(productId);
            const totalRedeemedAmount = await cashPool.getRedeemedAmount(productId);

            expect(totalRedeemedEquities).to.equal(token1Balance);
            expect(totalRedeemedAmount).to.equal(redeemedAmount);

            // remove product
            tx = await cashPool.removeProduct(productId);
            receipt = await tx.wait();

            event = receipt.events[0];
            expect(event.event).to.equal("RemovedProduct");
            expect(event.args.productId).to.equal(productId);
            expect(event.args.redeemedEquities).to.equal(totalRedeemedEquities);
            expect(event.args.redeemedAmount).to.equal(totalRedeemedAmount);
        });
    });
});