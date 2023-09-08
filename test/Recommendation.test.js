const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
// const { deployMockContract } = waffle;

const QUALIFICATION_SLOT_ID = 20;

describe('Recommendation', function () {
    let owner, referrer, referral, longVoucher, recommendation;

    beforeEach(async () => {
        [owner, referrer, referral] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        longVoucher = await longVoucherFactory.deploy("LongFil Voucher", "LongVoucher", 18, owner.address);

        const recommendationFactory = await ethers.getContractFactory('Recommendation');
        recommendation = await recommendationFactory.deploy();

        await longVoucher.connect(owner).addSlotManager(recommendation.address, [QUALIFICATION_SLOT_ID]);
        await recommendation.initialize(longVoucher.address, QUALIFICATION_SLOT_ID, owner.address);
    });

    describe('initialization', function () {
        it('initialization', async function () {
            expect(await recommendation.longVoucher()).to.equal(longVoucher.address);
            expect(await recommendation.owner()).to.equal(owner.address);
            expect(await recommendation.name()).to.equal("LongFil Voucher");
            expect(await recommendation.version()).to.equal("1");
            expect(await longVoucher.managerOf(QUALIFICATION_SLOT_ID)).to.equal(recommendation.address);
        });
    });

    describe('qualification', function () {
        it('mint', async function () {
            await expect(recommendation.connect(referrer).mint(referrer.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(recommendation.connect(owner).mint(ethers.constants.AddressZero)).to.be.revertedWith("zero address");

            expect(await longVoucher['balanceOf(address)'](referrer.address)).to.equal(0);
            const tx = await recommendation.connect(owner).mint(referrer.address);
            const receipt = await tx.wait();
            // console.log(receipt)

            const mintEvent = receipt.events[4];
            expect(mintEvent.event).to.equal("Mint");
            expect(mintEvent.args.receiver).to.equal(referrer.address);

            expect(await longVoucher['balanceOf(address)'](referrer.address)).to.equal(1);
            const tokenId = await longVoucher.tokenOfOwnerByIndex(referrer.address, 0);
            expect(mintEvent.args.qualificationId).to.equal(tokenId);

            expect(await longVoucher.slotOf(tokenId)).to.equal(QUALIFICATION_SLOT_ID);

            expect(await recommendation.isReferrer(referrer.address)).to.be.true;
        });

        it('transfer', async function () {
            await recommendation.connect(owner).mint(referrer.address);
            const tokenId1 = await longVoucher.tokenOfOwnerByIndex(referrer.address, 0);
            await recommendation.connect(owner).mint(referrer.address);
            const tokenId2 = await longVoucher.tokenOfOwnerByIndex(referrer.address, 1);

            // trasfer value should fail
            // function transferFrom( uint256 _fromTokenId, address _to, uint256 _value) external payable returns (uint256);
            await expect(longVoucher.connect(referrer)['transferFrom(uint256,address,uint256)']
                (tokenId1, referral.address, 0)).to.be.revertedWith("illegal transfer");
            // function transferFrom(uint256 _fromTokenId, uint256 _toTokenId, uint256 _value) external payable;
            await expect(longVoucher.connect(referrer)['transferFrom(uint256,uint256,uint256)']
                (tokenId1, tokenId2, 0)).to.be.revertedWith("illegal transfer");

            // function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes calldata data) external payable;
            expect(await longVoucher.connect(referrer)['safeTransferFrom(address,address,uint256,bytes)']
                (referrer.address, referral.address, tokenId1, 0x0)).to.be.ok;
            // function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable;
            expect(await longVoucher.connect(referrer)['safeTransferFrom(address,address,uint256)']
                (referrer.address, referral.address, tokenId2)).to.be.ok;
            // now, referrer have no qualifications
            expect(await recommendation.isReferrer(referrer.address)).to.be.false;
            // // function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
            expect(await longVoucher.connect(referral)['transferFrom(address,address,uint256)']
                (referral.address, referrer.address, tokenId1)).to.be.ok;
            // now, referrer have one qualification
            expect(await recommendation.isReferrer(referrer.address)).to.be.true;

            // burn
            await longVoucher.connect(referrer).burn(tokenId1);
            expect(await recommendation.isReferrer(referrer.address)).to.be.false;
        });
    });

    describe('bind', function () {
        // make referrer a referrer
        beforeEach(async () => {
        });

        it('bind', async function () {
            let [exists, info] = (await recommendation.getReferralInfo(referral.address));
            expect(exists).to.be.false;

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

            // beyond deadline
            let lastestTimestamp = await helpers.time.latest();
            let data = { referrer: referrer.address, deadline: lastestTimestamp };
            let signature = await referral._signTypedData(domain, types, data);
            signature = signature.substring(2);
            let r = "0x" + signature.substring(0, 64);
            let s = "0x" + signature.substring(64, 128);
            let v = parseInt(signature.substring(128, 130), 16);
            await expect(recommendation.bind(data.referrer, data.deadline, v, r, s)).to.be.rejectedWith("beyond deadline");

            // bind non referral should fail
            lastestTimestamp = await helpers.time.latest();
            data = { referrer: referrer.address, deadline: lastestTimestamp + 3600 };
            signature = await referral._signTypedData(domain, types, data);
            signature = signature.substring(2);
            r = "0x" + signature.substring(0, 64);
            s = "0x" + signature.substring(64, 128);
            v = parseInt(signature.substring(128, 130), 16);
            await expect(recommendation.bind(data.referrer, data.deadline, v, r, s)).to.be.revertedWith("missing qualification");

            // mint qualification
            await recommendation.connect(owner).mint(referrer.address);

            // normal
            lastestTimestamp = await helpers.time.latest();
            data = { referrer: referrer.address, deadline: lastestTimestamp + 3600 };
            signature = await referral._signTypedData(domain, types, data);
            signature = signature.substring(2);
            r = "0x" + signature.substring(0, 64);
            s = "0x" + signature.substring(64, 128);
            v = parseInt(signature.substring(128, 130), 16);

            const tx = await recommendation.bind(data.referrer, data.deadline, v, r, s);
            const receipt = await tx.wait();

            let blockNumber = await helpers.time.latestBlock();
            const bindEvent = receipt.events[0]; 
            // console.log(bindEvent)
            expect(bindEvent.args.referrer).to.equal(referrer.address);
            expect(bindEvent.args.referral).to.equal(referral.address);
            expect(bindEvent.args.bindAt).to.equal(blockNumber);

            [exists, info] = (await recommendation.getReferralInfo(referral.address));
            expect(exists).to.be.true;
            expect(info.bindAt).to.equal(blockNumber);
            expect(info.referrer).to.equal(referrer.address);

            // bind again should fail
            await expect(recommendation.bind(data.referrer, data.deadline, v, r, s)).to.be.revertedWith("already bind");
        });
    });
    describe('ISlotManager', function () {
        it('*ValueTransfer', async function () {
            await expect(recommendation.beforeValueTransfer(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                0,
                0,
                0,
                0
            )).to.be.revertedWith("illegal caller");
            await expect(recommendation.afterValueTransfer(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                0,
                0,
                0,
                0
            )).to.be.revertedWith("illegal caller");
        });
    });
});