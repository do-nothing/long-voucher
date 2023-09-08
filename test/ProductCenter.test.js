
const { expect, assert } = require('chai');
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const Errors = require("./errors");

const MIN_SUBSCRIPTION_PERIOD = 2880;
const MAX_SUBSCRIPTION_PERIOD = 2880 * 28;

const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("admin"));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const CASHIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cashier"));
    ["10000000000000000000", "1000000000000000000", "33", "35", "0", "0x0B306BF915C4d645ff596e518fAf3F9669b97016"]


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

describe('ProductCenter', function () {
    let owner, operator, cashier, subscriber, longVoucher, productCenter, interestRate;

    beforeEach(async () => {
        [owner, operator, cashier, subscriber] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongFil", 18, owner.address);

        const recommendationCenterFactory = await ethers.getContractFactory('TestOnlyRecommendationCenter');
        recommendationCenter = await recommendationCenterFactory.deploy();

        const filForwarderFactory = await ethers.getContractFactory('TestOnlyFilForwarder');
        filForwarder = await filForwarderFactory.deploy();

        const productCenterFactory = await ethers.getContractFactory('ProductCenter');
        productCenter = await productCenterFactory.deploy();
        await productCenter.initialize(longVoucher.address, recommendationCenter.address, filForwarder.address, owner.address);

        const interestRateFactory = await ethers.getContractFactory('TieredInterestRate');
        interestRate = await interestRateFactory.deploy();

        // set productCenter as a slot manager of longVoucher
        await longVoucher.connect(owner).addSlotManager(productCenter.address, []);

    });

    describe('initialization', function () {
        it('initialization', async function () {
            expect(await productCenter.longVoucher()).to.equal(longVoucher.address);
            expect(await productCenter.recommendationCenter()).to.equal(recommendationCenter.address);
            expect(await productCenter.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
            expect(await productCenter.getRoleAdmin(ADMIN_ROLE)).to.equal(ADMIN_ROLE);
            expect(await productCenter.getRoleAdmin(OPERATOR_ROLE)).to.equal(ADMIN_ROLE);
            expect(await productCenter.getRoleAdmin(CASHIER_ROLE)).to.equal(ADMIN_ROLE);
            expect(await productCenter.productCount()).to.equal(0);
        });
    });

    describe('access control', function () {
        it('access control', async function () {
            expect(await productCenter.hasRole(OPERATOR_ROLE, operator.address)).to.be.false;
            expect(await productCenter.hasRole(CASHIER_ROLE, cashier.address)).to.be.false;

            // operator can not grant role to self
            await expect(productCenter.connect(operator).grantRole(OPERATOR_ROLE, operator.address)).to.be.reverted;
            expect(await productCenter.hasRole(OPERATOR_ROLE, operator.address)).to.be.false;

            // cashier can not grant role to self
            await expect(productCenter.connect(cashier).grantRole(CASHIER_ROLE, cashier.address)).to.be.reverted;
            expect(await productCenter.hasRole(CASHIER_ROLE, cashier.address)).to.be.false;

            // admin_role can grant operator role
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            expect(await productCenter.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;

            // admin_role can grant cashier role
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
            expect(await productCenter.hasRole(CASHIER_ROLE, cashier.address)).to.be.true;

            // admin_role can revole operator role
            await productCenter.connect(owner).revokeRole(OPERATOR_ROLE, operator.address);
            expect(await productCenter.hasRole(OPERATOR_ROLE, operator.address)).to.be.false;

            // admin_role can grant cashier role
            await productCenter.connect(owner).revokeRole(CASHIER_ROLE, cashier.address);
            expect(await productCenter.hasRole(CASHIER_ROLE, cashier.address)).to.be.false;
        });
    });

    describe('product creation', function () {
        const productId = 1;
        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);

        });

        it('product parameter verification', async function () {
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + 10, 100, interestRate.address);
            await expect(productCenter.connect(owner).create(productId, parameters)).to.be.revertedWith("AccessControl: account 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 0x46a52cf33029de9f84853745a87af28464c80bf0346df1b32e205fc73319f622");

            // totalQuota == 0
            parameters.totalQuota = 0;
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.BAD_TOTALQUOTA);

            // minHoldingDuration > totalQuota
            parameters.totalQuota = ethers.utils.parseEther("100");
            parameters.minSubscriptionAmount = ethers.utils.parseEther("101");
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.BAD_MINSUBSCRIPTIONAMOUNT);

            // meta.beginSubscriptionBlock < block.number"
            parameters.minSubscriptionAmount = ethers.utils.parseEther("1");
            parameters.beginSubscriptionBlock = (await helpers.time.latestBlock());
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.BAD_BEGINSUBSCRIPTIONBLOCK);

            // meta.endSubscriptionBlock <= meta.beginSubscriptionBlock
            parameters.beginSubscriptionBlock = (await helpers.time.latestBlock()) + 1;
            parameters.endSubscriptionBlock = parameters.beginSubscriptionBlock;
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.BAD_ENDSUBSCRIPTIONBLOCK);

            // meta.endSubscriptionBlock - meta.beginSubscriptionBlock < 1 day
            parameters.beginSubscriptionBlock = (await helpers.time.latestBlock()) + 1;
            parameters.endSubscriptionBlock = parameters.beginSubscriptionBlock + MIN_SUBSCRIPTION_PERIOD - 1;
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.BAD_ENDSUBSCRIPTIONBLOCK);

            // meta.endSubscriptionBlock - meta.beginSubscriptionBlock > 28 day
            parameters.beginSubscriptionBlock = (await helpers.time.latestBlock()) + 1;
            parameters.endSubscriptionBlock = parameters.beginSubscriptionBlock + MAX_SUBSCRIPTION_PERIOD + 1;
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.BAD_ENDSUBSCRIPTIONBLOCK);

            // "require: meta.interestRate != address(0)"
            parameters.beginSubscriptionBlock = (await helpers.time.latestBlock()) + 1;
            parameters.endSubscriptionBlock = parameters.beginSubscriptionBlock + MIN_SUBSCRIPTION_PERIOD + 1;
            parameters.minHoldingDuration = 100;
            parameters.interestRate = ethers.constants.AddressZero;
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.ZERO_ADDRESS);
        });

        it('create', async function () {
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            const tx = await productCenter.connect(operator).create(productId, parameters);
            const receipt = await tx.wait();

            // console.log(receipt);
            // ProductCreated event 
            const createdEvent = receipt.events[1];
            expect(createdEvent.event).to.equal("ProductCreated");
            expect(createdEvent.args.productId).to.equal(productId);
            expect(createdEvent.args.operator).to.equal(operator.address);
            const eventParameters = createdEvent.args.parameters;
            expect(eventParameters.totalQuota).to.equal(parameters.totalQuota);
            expect(eventParameters.minSubscriptionAmount).to.equal(parameters.minSubscriptionAmount);
            expect(eventParameters.beginSubscriptionBlock).to.equal(parameters.beginSubscriptionBlock);
            expect(eventParameters.endSubscriptionBlock).to.equal(parameters.endSubscriptionBlock);
            expect(eventParameters.minHoldingDuration).to.equal(parameters.minHoldingDuration);
            expect(eventParameters.interestRate).to.equal(parameters.interestRate);

            // check parameters
            const productParameters = await productCenter.getProductParameters(productId);
            expect(productParameters.totalQuota).to.equal(parameters.totalQuota);
            expect(productParameters.minSubscriptionAmount).to.equal(parameters.minSubscriptionAmount);
            expect(productParameters.beginSubscriptionBlock).to.equal(parameters.beginSubscriptionBlock);
            expect(productParameters.endSubscriptionBlock).to.equal(parameters.endSubscriptionBlock);
            expect(productParameters.minHoldingDuration).to.equal(parameters.minHoldingDuration);
            expect(productParameters.interestRate).to.equal(parameters.interestRate);


            // long voucher
            expect(await longVoucher.managerOf(productId)).to.equal(productCenter.address);

            // create again should fail
            nowBlockNumer = await helpers.time.latestBlock();
            parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.DUPLICATED_PRODUCT_ID);
        });

        it('unavaiable product id', async function () {
            // add another slot manager
            await longVoucher.connect(owner).addSlotManager(subscriber.address, []);
            // 占据slot 1
            await longVoucher.connect(subscriber).claimSlot(productId);

            // create should fail
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await expect(productCenter.connect(operator).create(productId, parameters)).to.be.revertedWith(Errors.NOT_SLOT_MANAGER_OF_SLOT);
        });

    });

    describe('subscribe', function () {
        const productId = 1;
        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);

        });

        it('parameter verification', async function () {
            // should fail if product not exists 
            await expect(productCenter.connect(subscriber).subscribe(productId)).to.be.revertedWith(Errors.PRODUCT_NOT_EXISTS);

            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            // < minSubscriptionAmount
            await expect(productCenter.connect(subscriber).subscribe(productId, { value: 0 })).to.be.revertedWith(Errors.LESS_THAN_MINSUBSCRIPTIONAMOUNT);
            // exceeds total quota 100
            await expect(productCenter.connect(subscriber).subscribe(productId, { value: ethers.utils.parseEther("101") })).to.be.revertedWith(Errors.EXCEEDS_TOTALQUOTA);
        });

        it('period verification', async function () {
            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 3, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 3, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            // should fail if subscription not opening
            expect(await helpers.time.latestBlock() + 1 < parameters.beginSubscriptionBlock).to.be.true;
            await expect(productCenter.connect(subscriber).subscribe(productId)).to.be.revertedWith(Errors.INVALID_PRODUCT_STAGE);

            // should fail if post subscription period
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 10);
            expect(await helpers.time.latestBlock() + 1 > parameters.beginSubscriptionBlock).to.be.true;
            await expect(productCenter.connect(subscriber).subscribe(productId)).to.be.revertedWith(Errors.INVALID_PRODUCT_STAGE);
        });

        it('subscribe', async function () {
            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            let tx = await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            let receipt = await tx.wait();
            // console.log(receipt)

            // 
            expect(await longVoucher['balanceOf(address)'](subscriber.address)).to.equal(1);
            let tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            let tokenValue = await longVoucher['balanceOf(uint256)'](tokenId);

            let subscribeEvent = receipt.events[4];
            // console.log(subscribeEvent)
            expect(subscribeEvent.event).to.equal("Subscribe");
            expect(subscribeEvent.args.productId).to.equal(productId);
            expect(subscribeEvent.args.subscriber).to.equal(subscriber.address);
            expect(subscribeEvent.args.principal).to.equal(principal);
            expect(subscribeEvent.args.voucherId).to.equal(tokenId);

            nowBlockNumer = await helpers.time.latestBlock();


            // product
            expect(await ethers.provider.getBalance(productCenter.address)).to.equal(principal);
            expect(await productCenter.getTotalEquities(productId)).to.equal(tokenValue);
            expect(await productCenter.getTotalFundsRaised(productId)).to.equal(principal);
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.true;
            let subscription = await productCenter.getSubscription(productId, subscriber.address);
            expect(subscription.atBlock).to.equal(nowBlockNumer);
            expect(subscription.subscriber).to.equal(subscriber.address);
            expect(subscription.principal).to.equal(principal);
            expect(subscription.voucherId).to.equal(tokenId);

            // console.log(await longVoucher['balanceOf(uint256)'](tokenId))

            // subscribe again should work
            tx = await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            receipt = await tx.wait();
            // console.log(receipt.events.map(event => event.topics[0]))

            // old voucher has been burned, new token takes index 0
            await expect(longVoucher.slotOf(tokenId)).to.be.revertedWith(Errors.INVALID_TOKEN_ID);

            const newPrincipal = principal.mul(2);
            tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            tokenValue = await longVoucher['balanceOf(uint256)'](tokenId);

            subscribeEvent = receipt.events[7];
            expect(subscribeEvent.event).to.equal("Subscribe");
            expect(subscribeEvent.args.productId).to.equal(productId);
            expect(subscribeEvent.args.subscriber).to.equal(subscriber.address);
            expect(subscribeEvent.args.principal).to.equal(newPrincipal);
            expect(subscribeEvent.args.voucherId).to.equal(tokenId);

            nowBlockNumer = await helpers.time.latestBlock();

            // product
            expect(await ethers.provider.getBalance(productCenter.address)).to.equal(newPrincipal);
            expect(await productCenter.getTotalEquities(productId)).to.equal(tokenValue);
            expect(await productCenter.getTotalFundsRaised(productId)).to.equal(newPrincipal);
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.true;
            subscription = await productCenter.getSubscription(productId, subscriber.address);
            expect(subscription.atBlock).to.equal(nowBlockNumer);
            expect(subscription.subscriber).to.equal(subscriber.address);
            expect(subscription.principal).to.equal(newPrincipal);
            expect(subscription.voucherId).to.equal(tokenId);

            // console.log(await longVoucher['balanceOf(uint256)'](tokenId))
        });

        it('transfer control', async function () {
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            const tokenId1 = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);

            await productCenter.connect(operator).subscribe(productId, { value: principal });
            const tokenId2 = await longVoucher.tokenOfOwnerByIndex(operator.address, 0);

            // function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes calldata data) external payable;
            await expect(longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256,bytes)']
                (subscriber.address, operator.address, tokenId1, 0x0)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);
            // function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable;
            await expect(longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256)']
                (subscriber.address, operator.address, tokenId1)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);
            // function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
            await expect(longVoucher.connect(subscriber)['transferFrom(address,address,uint256)']
                (subscriber.address, operator.address, tokenId1)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);
            // burn
            // await expect(longVoucher.connect(subscriber).burn(tokenId1)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);

            // function transferFrom(uint256 _fromTokenId, uint256 _toTokenId, uint256 _value) external payable;
            await expect(longVoucher.connect(subscriber)['transferFrom(uint256,uint256,uint256)']
                (tokenId1, tokenId2, principal)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);
            await expect(longVoucher.connect(operator)['transferFrom(uint256,uint256,uint256)']
                (tokenId2, tokenId1, principal)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);
            // function transferFrom( uint256 _fromTokenId, address _to, uint256 _value) external payable returns (uint256);
            await expect(longVoucher.connect(subscriber)['transferFrom(uint256,address,uint256)']
                (tokenId1, operator.address, principal)).to.be.rejectedWith(Errors.TRANSFORM_CONTROL);

            // fastup to online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 10);
            await expect(productCenter.connect(subscriber).subscribe(productId)).to.be.revertedWith(Errors.INVALID_PRODUCT_STAGE);

            // tokenid3 can transfer as sender or receiver
            // function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes calldata data) external payable;
            expect(await longVoucher.connect(subscriber)['safeTransferFrom(address,address,uint256,bytes)']
                (subscriber.address, operator.address, tokenId1, 0x0)).to.be.ok;
            // function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable;
            expect(await longVoucher.connect(operator)['safeTransferFrom(address,address,uint256)']
                (operator.address, subscriber.address, tokenId1)).to.be.ok;
            // function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
            expect(await longVoucher.connect(subscriber)['transferFrom(address,address,uint256)']
                (subscriber.address, operator.address, tokenId1)).to.be.ok;
            // function transferFrom(uint256 _fromTokenId, uint256 _toTokenId, uint256 _value) external payable;
            expect(await longVoucher.connect(operator)['transferFrom(uint256,uint256,uint256)']
                (tokenId1, tokenId2, principal.div(100))).to.be.ok;
            // function transferFrom(uint256 _fromTokenId, uint256 _toTokenId, uint256 _value) external payable;
            expect(await longVoucher.connect(operator)['transferFrom(uint256,uint256,uint256)']
                (tokenId2, tokenId1, principal.div(100))).to.be.ok;
            expect(await longVoucher.connect(operator)['transferFrom(uint256,uint256,uint256)']
                (tokenId1, tokenId2, principal.div(100))).to.be.ok;
            // function transferFrom( uint256 _fromTokenId, address _to, uint256 _value) external payable returns (uint256);
            expect(await longVoucher.connect(operator)['transferFrom(uint256,address,uint256)']
                (tokenId1, subscriber.address, principal.div(100))).to.be.ok;
            // brun
            expect(await longVoucher.connect(operator).burn(tokenId1)).to.be.ok;

        });

        it('product equities', async function () {
            // create product
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            const tokenId1 = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            const token1Balance = await longVoucher['balanceOf(uint256)'](tokenId1);

            expect(await productCenter.getTotalEquities(productId)).to.equal(token1Balance);

            // fastup to online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 10);

            await longVoucher.connect(subscriber).burn(tokenId1);
            expect(await productCenter.getTotalEquities(productId)).to.equal(0);
        });

    });

    describe('cancel subscription', function () {
        const productId = 1;

        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
        });


        it('cancelSubscription should failed in post subscription', async function () {
            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            // subscribe
            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.true;

            // fastup
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 10);

            await expect(productCenter.connect(subscriber).cancelSubscription(productId, 1, subscriber.address)).to.be.revertedWith(Errors.INVALID_PRODUCT_STAGE);
        });

        it('cancelSubscription', async function () {
            // should fail if product not exists 
            await expect(productCenter.connect(subscriber).cancelSubscription(productId, ethers.utils.parseEther("1"), subscriber.address)).to.be.revertedWith(Errors.PRODUCT_NOT_EXISTS);

            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            // should fail if not subscriber of product
            await expect(productCenter.connect(subscriber).cancelSubscription(productId, ethers.utils.parseEther("1"), subscriber.address)).to.be.revertedWith(Errors.NOT_SUBSCRIBER);

            // subscribe
            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.true;

            // should fail if receiver is zero address
            await expect(productCenter.connect(subscriber).cancelSubscription(productId, ethers.utils.parseEther("1"), ethers.constants.AddressZero)).to.be.revertedWith(Errors.ZERO_ADDRESS);
            // should fail if amount is great than principal
            await expect(productCenter.connect(subscriber).cancelSubscription(productId, principal.add(1), subscriber.address)).to.be.revertedWith(Errors.INSUFFICIENT_BALANCE);
            // 如果赎回导致剩余本金少于最小认购金额，赎回失败
            await expect(productCenter.connect(subscriber).cancelSubscription(productId, ethers.utils.parseEther("9.5"), subscriber.address)).to.be.revertedWith(Errors.LESS_THAN_MINSUBSCRIPTIONAMOUNT);

            // get voucher id
            let tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            // console.log(await longVoucher['balanceOf(uint256)'](tokenId))

            // cancel 1, use cashier as receiver
            let cashierOriginBalance = await ethers.provider.getBalance(cashier.address);
            let amountToCancel = ethers.utils.parseEther("1");
            let newPrincipal = principal.sub(amountToCancel);
            let tx = await productCenter.connect(subscriber).cancelSubscription(productId, amountToCancel, cashier.address);
            let receipt = await tx.wait();
            // console.log(receipt)
            console.log(receipt.events.map(event => event.topics[0]))

            nowBlockNumer = await helpers.time.latestBlock();

            let oldTokenId = tokenId;
            // old token has been burned
            await expect(longVoucher.slotOf(oldTokenId)).to.be.revertedWith(Errors.INVALID_TOKEN_ID);

            tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            let tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            // CancelSubscription event
            const cancelEvent = receipt.events[7];
            expect(cancelEvent.event).to.equal("CancelSubscription");
            expect(cancelEvent.args.productId).to.equal(productId);
            expect(cancelEvent.args.subscriber).to.equal(subscriber.address);
            expect(cancelEvent.args.principal).to.equal(principal);
            expect(cancelEvent.args.voucherId).to.equal(oldTokenId);

            // Subscribe event
            const subscribeEvent = receipt.events[8];
            expect(subscribeEvent.event).to.equal("Subscribe");
            expect(subscribeEvent.args.productId).to.equal(productId);
            expect(subscribeEvent.args.subscriber).to.equal(subscriber.address);
            expect(subscribeEvent.args.principal).to.equal(newPrincipal);
            expect(subscribeEvent.args.voucherId).to.equal(tokenId);


            // check
            expect(await ethers.provider.getBalance(productCenter.address)).to.equal(newPrincipal);
            expect(await productCenter.getTotalEquities(productId)).to.equal(tokenBalance);
            expect(await productCenter.getTotalFundsRaised(productId)).to.equal(newPrincipal);
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.true;
            expect(await ethers.provider.getBalance(cashier.address)).to.equal(cashierOriginBalance.add(amountToCancel));
            let subscription = await productCenter.getSubscription(productId, subscriber.address);
            expect(subscription.atBlock).to.equal(nowBlockNumer);
            expect(subscription.subscriber).to.equal(subscriber.address);
            expect(subscription.principal).to.equal(newPrincipal);
            expect(subscription.voucherId).to.equal(tokenId);


            /// call cancelSubscription again should work
            await productCenter.connect(subscriber).cancelSubscription(productId, amountToCancel, cashier.address);
            newPrincipal = newPrincipal.sub(amountToCancel);

            oldTokenId = tokenId;
            // old token has been burned
            await expect(longVoucher.slotOf(oldTokenId)).to.be.revertedWith(Errors.INVALID_TOKEN_ID);

            tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            expect(await ethers.provider.getBalance(productCenter.address)).to.equal(newPrincipal);
            expect(await productCenter.getTotalEquities(productId)).to.equal(tokenBalance);
            expect(await productCenter.getTotalFundsRaised(productId)).to.equal(newPrincipal);

            /// 认购期结束后不能再调用cancelSubscription
            // fastup
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 10);
            await expect(productCenter.connect(subscriber).cancelSubscription(productId, amountToCancel, cashier.address)).to.be.revertedWith(Errors.INVALID_PRODUCT_STAGE);
        });

        it('cancelSubscription all', async function () {
            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            // subscribe
            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.true;

            // get voucher id
            let tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            let tokenIdBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            expect(await productCenter.getTotalEquities(productId)).to.equal(tokenIdBalance);
            expect(await productCenter.getTotalFundsRaised(productId)).to.equal(principal);

            // cancel 1, use cashier as receiver
            const cashierOriginBalance = await ethers.provider.getBalance(cashier.address);
            let tx = await productCenter.connect(subscriber).cancelSubscription(productId, principal, cashier.address);
            let receipt = await tx.wait();
            // console.log(receipt)

            // CancelSubscription event
            const cancelEvent = receipt.events[3];
            expect(cancelEvent.event).to.equal("CancelSubscription");
            expect(cancelEvent.args.productId).to.equal(productId);
            expect(cancelEvent.args.subscriber).to.equal(subscriber.address);
            expect(cancelEvent.args.principal).to.equal(principal);
            expect(cancelEvent.args.voucherId).to.equal(tokenId);

            // check
            expect(await productCenter.isSubscriber(productId, subscriber.address)).to.be.false;
            await expect(productCenter.getSubscription(productId, subscriber.address)).to.be.revertedWith(Errors.NOT_SUBSCRIBER);
            expect(await ethers.provider.getBalance(cashier.address)).to.equal(cashierOriginBalance.add(principal));
            expect(await productCenter.getTotalEquities(productId)).to.equal(0);
            expect(await productCenter.getTotalFundsRaised(productId)).to.equal(0);

        });

    });

    describe('loan', function () {
        const productId = 1;

        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
        });

        it('loan', async function () {
            const loanAmount = ethers.utils.parseEther("1");
            // should fail if is not cashier
            await expect(productCenter.connect(subscriber).loan(productId, loanAmount, subscriber.address)).to.be.revertedWith("AccessControl: account 0x90f79bf6eb2c4f870365e785982e1f101e93b906 is missing role 0x931a5bd524786b2065f0be77546460f0eb0b462719abf2638dd4ae99f772b5eb");

            // should fail if product not exists 
            await expect(productCenter.connect(cashier).loan(productId, loanAmount, subscriber.address)).to.be.revertedWith(Errors.PRODUCT_NOT_EXISTS);

            // create product
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            // subscribe
            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });

            // should fail if still in subscription stage
            await expect(productCenter.connect(cashier).loan(productId, loanAmount, subscriber.address)).to.be.revertedWith(Errors.INVALID_PRODUCT_STAGE);

            // fastup
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 10);

            // now we can redeem, use cashier as receiver
            let subscriberOriginBalance = await ethers.provider.getBalance(subscriber.address);
            let tx = await productCenter.connect(cashier).loan(productId, loanAmount, subscriber.address);
            let receipt = await tx.wait();
            // console.log(receipt);
            console.log(receipt.events.map(event => event.topics[0]))

            // loan event
            const offerEvent = receipt.events[0];
            expect(offerEvent.event).to.equal("OfferLoans");
            expect(offerEvent.args.productId).to.equal(productId);
            expect(offerEvent.args.receiver).to.equal(subscriber.address.toLowerCase());
            expect(offerEvent.args.cashier).to.equal(cashier.address);

            // check
            expect(await productCenter.getTotalFundsLoaned(productId)).to.equal(loanAmount);
            expect(await ethers.provider.getBalance(subscriber.address)).to.equal(subscriberOriginBalance.add(loanAmount));

            // loan again work
            await productCenter.connect(cashier).loan(productId, loanAmount, subscriber.address);
            expect(await productCenter.getTotalFundsLoaned(productId)).to.equal(loanAmount.mul(2));
            expect(await ethers.provider.getBalance(subscriber.address)).to.equal(subscriberOriginBalance.add(loanAmount.mul(2)));

            // should fail if there is insufficient balance
            await expect(productCenter.connect(cashier).loan(productId, ethers.utils.parseEther("100"), subscriber.address)).to.be.revertedWith(Errors.INSUFFICIENT_BALANCE);
        });
    });

    describe('RecommendationCenter', function () {
        const productId = 1;

        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
            // deploy TestOnlyCashPool
        });

        it('*EqutiesTransfer', async function () {
            // test *EqutiesTransfer
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);
            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            const tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);

            const equitiesTransfer = await recommendationCenter.equitiesTransfer();
            expect(equitiesTransfer.productId).to.equal(productId);
            expect(equitiesTransfer.from).to.equal(ethers.constants.AddressZero);
            expect(equitiesTransfer.to).to.equal(subscriber.address);
            expect(equitiesTransfer.fromVoucherId).to.equal(0);
            expect(equitiesTransfer.toVoucherId).to.equal(tokenId);
            expect(equitiesTransfer.value).to.be.gt(principal)
        });
    });

    describe('view functions', function () {
        const productId = 1;

        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
            // deploy TestOnlyCashPool
        });

        it('product iterate', async function () {
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 2, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 2, 100, interestRate.address);
            await productCenter.connect(operator).create(1, parameters);
            await productCenter.connect(operator).create(2, parameters);

            expect(await productCenter.productCount()).to.equal(2);
            expect(await productCenter.productIdByIndex(0)).to.equal(1);
            expect(await productCenter.productIdByIndex(1)).to.equal(2);
        });

        it('voucher principal and interest', async function () {
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(1, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            nowBlockNumer = await helpers.time.latestBlock();

            const tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            const tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            const expectSubscriptionInterest = await interestRate.calculate(
                principal, 
                parameters.beginSubscriptionBlock, 
                parameters.endSubscriptionBlock, 
                nowBlockNumer,
                parameters.endSubscriptionBlock, 
            );
            const expectEquities = principal.add(expectSubscriptionInterest);
            expect(tokenBalance).to.equal(expectEquities);

            // interest is 0 in subscription stage
            expect(await productCenter.voucherInterest(tokenId)).to.equal(0);

            nowBlockNumer = await helpers.time.latestBlock();
            let endBlock = parameters.endSubscriptionBlock + 10;
            // fastup 
            await helpers.mine(endBlock - nowBlockNumer);
            let expectInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock, 
                parameters.endSubscriptionBlock, 
                parameters.endSubscriptionBlock, 
                endBlock
            )
            expect(await productCenter.voucherInterest(tokenId)).to.equal(expectInterest);
        });

        it('isRedeemable & getRedeemableAmount', async function () {
            let nowBlockNumer = await helpers.time.latestBlock();
            let parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 10, interestRate.address);
            await productCenter.connect(operator).create(1, parameters);

            const principal = ethers.utils.parseEther("10");
            await productCenter.connect(subscriber).subscribe(productId, { value: principal });
            nowBlockNumer = await helpers.time.latestBlock();

            const tokenId = await longVoucher.tokenOfOwnerByIndex(subscriber.address, 0);
            const tokenBalance = await longVoucher['balanceOf(uint256)'](tokenId);

            const expectSubscriptionInterest = await interestRate.calculate(
                principal, 
                parameters.beginSubscriptionBlock, 
                parameters.endSubscriptionBlock, 
                nowBlockNumer,
                parameters.endSubscriptionBlock, 
            );
            const expectEquities = principal.add(expectSubscriptionInterest);
            expect(tokenBalance).to.equal(expectEquities);

            // not redeemable in subscription stage
            expect(await productCenter.isRedeemable(tokenId)).to.be.false
            // interest is 0 in subscription stage
            await expect(productCenter.getRedeemableAmount(tokenId)).to.be.revertedWith(Errors.NOT_REDEEMABLE_AT_PRESENT);

            // fastup 10 to online stage
            await helpers.mine(MIN_SUBSCRIPTION_PERIOD);
            expect(await productCenter.isRedeemable(tokenId)).to.be.false
            // interest is 0 in subscription stage
            await expect(productCenter.getRedeemableAmount(tokenId)).to.be.revertedWith(Errors.NOT_REDEEMABLE_AT_PRESENT);

            nowBlockNumer = await helpers.time.latestBlock();
            let endBlock = parameters.endSubscriptionBlock + 10;
            // fastup to satisfy min holding duration
            await helpers.mine(endBlock - nowBlockNumer);
            let expectInterest = await interestRate.calculate(
                tokenBalance,
                parameters.beginSubscriptionBlock, 
                parameters.endSubscriptionBlock, 
                parameters.endSubscriptionBlock, 
                endBlock
            )
            expect(await productCenter.isRedeemable(tokenId)).to.be.true;
            expect(await productCenter.getRedeemableAmount(tokenId)).to.equal(tokenBalance.add(expectInterest));
        });
    });
    describe('ISlotManager', function () {
        const productId = 1;

        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
            // deploy TestOnlyCashPool
        });

        it('*ValueTransfer', async function () {
            await expect(productCenter.beforeValueTransfer(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                0,
                0,
                0,
                0
            )).to.be.revertedWith(Errors.ILLEGAL_CALLER);
            await expect(productCenter.afterValueTransfer(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                0,
                0,
                0,
                0
            )).to.be.revertedWith(Errors.ILLEGAL_CALLER);
        });
    });

    describe('IRecommendationCenterConsumer', function () {
        const productId = 1;

        beforeEach(async () => {
            await productCenter.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await productCenter.connect(owner).grantRole(CASHIER_ROLE, cashier.address);
            // deploy TestOnlyCashPool
        });

        it('equitiesInterest', async function () {
            const nowBlockNumer = await helpers.time.latestBlock();
            const parameters = newProductParameters(
                ethers.utils.parseEther("100"), ethers.utils.parseEther("1"), nowBlockNumer + 1, nowBlockNumer + MIN_SUBSCRIPTION_PERIOD + 1, 100, interestRate.address);
            await productCenter.connect(operator).create(productId, parameters);

            const equities = ethers.utils.parseEther("10");
            expect(await productCenter.equitiesInterest(productId, equities, nowBlockNumer + 10)).to.equal(0);

            await helpers.mine(MIN_SUBSCRIPTION_PERIOD + 100);

            const nextBlockNumer = await helpers.time.latestBlock();
            const interest = await interestRate.calculate(equities, parameters.beginSubscriptionBlock, parameters.endSubscriptionBlock, parameters.endSubscriptionBlock, nextBlockNumer);
            expect(await productCenter.equitiesInterest(productId, equities, nextBlockNumer)).to.equal(interest);
        });
    });
});