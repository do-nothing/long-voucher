const { expect, assert } = require('chai');
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

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

describe('LongVoucherHelper', function () {
    let owner, slotManager1, slotManager2, receiver, longVoucher, longVoucherHelper;

    beforeEach(async () => {
        [owner, slotManager1, slotManager2, receiver] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongFil", 18, owner.address);

        const longVoucherHelperFactory = await ethers.getContractFactory('LongVoucherHelper');
        longVoucherHelper = await longVoucherHelperFactory.deploy(longVoucher.address);

        await longVoucher.connect(owner).addSlotManager(slotManager1.address, []);
        await longVoucher.connect(owner).addSlotManager(slotManager2.address, []);
    });

    describe('slot manager', function () {
        it('slot manager', async function () {
            expect(await longVoucherHelper.isSlotManager(slotManager1.address)).to.be.true;
            expect(await longVoucherHelper.isSlotManager(slotManager2.address)).to.be.true;

            const slotManagers = await longVoucherHelper.allSlotManagers();
            // console.log(slotManagers)
            expect(slotManagers.length).to.equal(2);
            expect(slotManagers[0]).to.equal(slotManager1.address);
            expect(slotManagers[1]).to.equal(slotManager2.address);

            await longVoucher.connect(slotManager1).claimSlot(1);
            await longVoucher.connect(slotManager1).mint(receiver.address, 1, 0);
            const tokenId = await longVoucher.tokenOfOwnerByIndex(receiver.address, 0);
            expect(await longVoucherHelper.managerOfToken(tokenId)).to.equal(slotManager1.address);
        });
    });

    describe('token set', function () {
        it('tokensOfOwner', async function () {
            await longVoucher.connect(slotManager1).claimSlot(1);
            await longVoucher.connect(slotManager1).mint(receiver.address, 1, 0);
            let token1 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 0);
            await longVoucher.connect(slotManager2).claimSlot(2);
            await longVoucher.connect(slotManager2).mint(receiver.address, 2, 0);
            let token2 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 1);

            let tokens = await longVoucherHelper.tokensOfOwner(receiver.address);
            expect(tokens.length).to.equal(2);
            expect(tokens[0]).to.equal(token2);
            expect(tokens[1]).to.equal(token1);
        });

        it('tokensOfOwnerBySlot', async function () {
            await longVoucher.connect(slotManager1).claimSlot(1);
            await longVoucher.connect(slotManager1).mint(receiver.address, 1, 0);
            let token1 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 0);
            await longVoucher.connect(slotManager1).mint(receiver.address, 1, 0);
            let token2 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 1);
            await longVoucher.connect(slotManager1).claimSlot(2);
            await longVoucher.connect(slotManager1).mint(receiver.address, 2, 0);
            let token3 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 2);

            let tokens = await longVoucherHelper.tokensOfOwnerBySlot(receiver.address, 1);
            expect(tokens.length).to.equal(2);
            expect(tokens[0]).to.equal(token2);
            expect(tokens[1]).to.equal(token1);

            tokens = await longVoucherHelper.tokensOfOwnerBySlot(receiver.address, 2);
            expect(tokens.length).to.equal(1);
            expect(tokens[0]).to.equal(token3);
        });

        it('tokensOfOwnerByManager', async function () {
            await longVoucher.connect(slotManager1).claimSlot(1);
            await longVoucher.connect(slotManager1).mint(receiver.address, 1, 0);
            let token1 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 0);
            await longVoucher.connect(slotManager1).claimSlot(2);
            await longVoucher.connect(slotManager1).mint(receiver.address, 2, 0);
            let token2 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 1);
            await longVoucher.connect(slotManager2).claimSlot(3);
            await longVoucher.connect(slotManager2).mint(receiver.address, 3, 0);
            let token3 = await longVoucher.tokenOfOwnerByIndex(receiver.address, 2);

            let tokens = await longVoucherHelper.tokensOfOwnerBySlotManager(receiver.address, slotManager1.address);
            expect(tokens.length).to.equal(2);
            expect(tokens[0]).to.equal(token2);
            expect(tokens[1]).to.equal(token1);

            tokens = await longVoucherHelper.tokensOfOwnerBySlotManager(receiver.address, slotManager2.address);
            expect(tokens.length).to.equal(1);
            expect(tokens[0]).to.equal(token3);
        });
    });
});