
const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
// const { deployMockContract } = waffle;
const Errors = require("./errors");


const name = "LongFil Voucher";
const symbol = "LongFil";
const decimals = 18;

describe('LongVoucher', function () {
    let owner, slotManager0, slotManager1, receiver0, receiver1, longVoucher;

    beforeEach(async () => {
        [owner, slotManager0, slotManager1, receiver0, receiver1, longVoucher] = await setup();
    });

    async function setup() {
        const [owner, slotManager0, slot1Manager, receiver0, receiver1] = await ethers.getSigners();

        const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
        const longVoucher = await longVoucherFactory.deploy(name, symbol, decimals, owner.address);

        return [owner, slotManager0, slot1Manager, receiver0, receiver1, longVoucher];
    }

    describe('constructor', function () {
        it('constructor', async function () {
            expect(await longVoucher.name()).to.equal(name);
            expect(await longVoucher.symbol()).to.equal(symbol);
            expect(await longVoucher.valueDecimals()).to.equal(decimals);

            expect(await longVoucher.metadataDescriptor()).to.equal(ethers.constants.AddressZero);
            expect(await longVoucher.owner()).to.equal(owner.address);
            expect(await longVoucher.slotURI(0)).to.equal("");
            await expect(longVoucher.tokenURI(0)).to.be.reverted;
            await expect(longVoucher.managerOf(0)).to.be.reverted;
        });
    });

    describe('admin methods', function () {
        it('addSlotManager', async function () {
            await expect(longVoucher.connect(slotManager0).addSlotManager(slotManager0.address, [])).to.be.revertedWith("Ownable: caller is not the owner");
            // await expect(longVoucher.connect(owner).addSlotManager(ethers.constants.AddressZero, [])).to.be.revertedWith(Errors.ZERO_ADDRESS);

            // owner can add slot manager
            const slot = 20;
            const tx = await longVoucher.connect(owner).addSlotManager(slotManager0.address, [slot]);
            const receipt = await tx.wait();
            // SlotAdminChanged event
            expect(receipt.events[1].event).to.equal("AddedSlotManager");
            expect(receipt.events[1].args.slotManager).to.equal(slotManager0.address);

            expect(await longVoucher.slotManagerCount()).to.equal(1);
            expect(await longVoucher.slotManagerByIndex(0)).to.equal(slotManager0.address);
            expect(await longVoucher.managerOf(slot)).to.equal(slotManager0.address);

            // add slot1Manager using claimed slot should revert
            await expect(longVoucher.connect(owner).addSlotManager(slotManager1.address, [slot])).to.be.revertedWith(Errors.NOT_SLOT_MANAGER_OF_SLOT);

            await longVoucher.connect(owner).addSlotManager(slotManager1.address, []);
            expect(await longVoucher.slotManagerCount()).to.equal(2);
            expect(await longVoucher.slotManagerByIndex(1)).to.equal(slotManager1.address);

            //add same slot manager should revert
            await expect(longVoucher.connect(owner).addSlotManager(slotManager0.address, [])).to.be.revertedWith(Errors.SLOT_MANAGER_ALREADY_EXISTS);
        });

        it('setMetadataDescriptor', async function () {
            await expect(longVoucher.connect(slotManager0).setMetadataDescriptor(ethers.constants.AddressZero)).to.be.revertedWith("Ownable: caller is not the owner");
            // await expect(longVoucher.connect(owner).setMetadataDescriptor(ethers.constants.AddressZero)).to.be.reverted;

            const descriptorFactory = await ethers.getContractFactory('TestOnlyMetadataDescriptor');
            const descriptor = await descriptorFactory.deploy();

            // setMetadataDescriptor
            let tx = await longVoucher.connect(owner).setMetadataDescriptor(descriptor.address);
            const receipt = await tx.wait();

            // SetMetadataDescriptor event
            const event = receipt.events[0];
            expect(event.event).to.equal("SetMetadataDescriptor");
            expect(event.args.metadataDescriptor).to.equal(descriptor.address);

            // metadataDescriptor() should work
            expect(await longVoucher.metadataDescriptor()).to.equal(descriptor.address);
        });
    });

    describe('slot manager methods', function () {
        beforeEach(async () => {
        });

        it('claim slot', async function () {
            const slot = 1;
            // can not claim slot if not slot manager
            await expect(longVoucher.connect(slotManager0).claimSlot(slot)).to.be.revertedWith(Errors.NOT_SLOT_MANAGER_ROLE);

            // add slot manager
            await longVoucher.connect(owner).addSlotManager(slotManager0.address, []);

            // claim slot
            await longVoucher.connect(slotManager0).claimSlot(slot);
            expect(await longVoucher.slotCount()).to.equal(1);
            expect(await longVoucher.managerOf(slot)).to.equal(slotManager0.address);

            // claim again should fail
            await expect(longVoucher.connect(slotManager0).claimSlot(slot)).to.be.revertedWith(Errors.NOT_SLOT_MANAGER_OF_SLOT);
        });

        it('mint', async function () {
            const slot = 1;
            const uintsToMint = ethers.utils.parseEther("1.0");

            // can not mint if slot not exists
            await expect(longVoucher.connect(slotManager0).mint(receiver0.address, slot, uintsToMint)).to.be.revertedWith(Errors.SLOT_NOT_EXISTS);

            // add slot manager
            await longVoucher.connect(owner).addSlotManager(slotManager0.address, []);
            // claim slot
            await longVoucher.connect(slotManager0).claimSlot(slot);

            // not manager of slot
            await expect(longVoucher.connect(slotManager1).mint(receiver0.address, slot, uintsToMint)).to.be.revertedWith(Errors.NOT_SLOT_MANAGER_OF_SLOT);

            // before mint
            expect(await longVoucher.totalSupply()).to.equal(0);
            expect(await longVoucher['balanceOf(address)'](receiver0.address)).to.equal(0);
            expect(await longVoucher.tokenSupplyInSlot(slot)).to.equal(0);

            // mint with slotManager0
            const tx = await longVoucher.connect(slotManager0).mint(receiver0.address, slot, uintsToMint);
            const receipt = await tx.wait();
            // console.log(receipt)

            // ERC721 Transfer event
            const transferEvent = receipt.events[0];
            expect(transferEvent.event).to.equal("Transfer");
            expect(transferEvent.args._from).to.equal(ethers.constants.AddressZero);
            expect(transferEvent.args._to).to.equal(receiver0.address);

            const tokenId = transferEvent.args._tokenId;

            // SlotChanged event by _mint
            const slotChangedEvent2 = receipt.events[1];
            expect(slotChangedEvent2.event).to.equal("SlotChanged");
            expect(slotChangedEvent2.args._tokenId).to.equal(tokenId);
            expect(slotChangedEvent2.args._oldSlot).to.equal(0);
            expect(slotChangedEvent2.args._newSlot).to.equal(slot);

            // ERC3525 TransferValue event
            // event TransferValue(uint256 indexed _fromTokenId, uint256 indexed _toTokenId, uint256 _value);
            const transferValueEvent = receipt.events[2];
            console.log(transferValueEvent)
            expect(transferValueEvent.event).to.equal("TransferValue");
            expect(transferValueEvent.args._fromTokenId).to.equal(0);
            expect(transferValueEvent.args._toTokenId).to.equal(tokenId);
            expect(transferValueEvent.args._value).to.equal(uintsToMint);

            // check 
            // ERC721
            expect(await longVoucher.totalSupply()).to.equal(1);
            expect(await longVoucher['balanceOf(address)'](receiver0.address)).to.equal(1);
            expect(await longVoucher.ownerOf(tokenId)).to.equal(receiver0.address);
            expect(await longVoucher.getApproved(tokenId)).to.equal(slotManager0.address);

            // ERC3525
            expect(await longVoucher.slotOf(tokenId)).to.equal(slot);
            expect(await longVoucher['balanceOf(uint256)'](tokenId)).to.equal(uintsToMint);

            expect(await longVoucher.slotByIndex(0)).to.equal(slot);
            expect(await longVoucher.tokenSupplyInSlot(slot)).to.equal(1);
            expect(await longVoucher.tokenInSlotByIndex(slot, 0)).to.equal(tokenId);


            // mint again
            expect(await longVoucher.connect(slotManager0).mint(receiver0.address, slot, uintsToMint)).to.be.ok;

            // add slot1Manager as SlotManager
            await longVoucher.connect(owner).addSlotManager(slotManager1.address, []);
            // slot1Manager can not mint slot 1
            await expect(longVoucher.connect(slotManager1).mint(receiver0.address, slot, uintsToMint)).to.be.revertedWith(Errors.NOT_SLOT_MANAGER_OF_SLOT);
        });

        it('burn', async function () {
            await longVoucher.connect(owner).addSlotManager(slotManager0.address, []);

            const slot = 1;
            const uintsToMint = ethers.utils.parseEther("1.0");

            // claim slot
            await longVoucher.connect(slotManager0).claimSlot(slot);

            // mint with slotManager0
            await longVoucher.connect(slotManager0).mint(receiver0.address, slot, uintsToMint);

            const tokenId = await longVoucher.tokenOfOwnerByIndex(receiver0.address, 0);

            // burn
            const tx = await longVoucher.connect(receiver0).burn(tokenId);
            const receipt = await tx.wait();

            // ERC3525 TransferValue event
            // event TransferValue(uint256 indexed _fromTokenId, uint256 indexed _toTokenId, uint256 _value);
            const transferValueEvent = receipt.events[0];
            expect(transferValueEvent.event).to.equal("TransferValue");
            expect(transferValueEvent.args._fromTokenId).to.equal(tokenId);
            expect(transferValueEvent.args._toTokenId).to.equal(0);
            expect(transferValueEvent.args._value).to.equal(uintsToMint);

            // SlotChanged event by _createSlot
            const slotChangedEvent1 = receipt.events[1];
            expect(slotChangedEvent1.event).to.equal("SlotChanged");
            expect(slotChangedEvent1.args._tokenId).to.equal(tokenId);
            expect(slotChangedEvent1.args._oldSlot).to.equal(slot);
            expect(slotChangedEvent1.args._newSlot).to.equal(0); //

            // ERC721 Transfer event
            const transferEvent = receipt.events[2];
            expect(transferEvent.event).to.equal("Transfer");
            expect(transferEvent.args._from).to.equal(receiver0.address);
            expect(transferEvent.args._to).to.equal(ethers.constants.AddressZero);


            // check 
            // ERC721
            expect(await longVoucher.totalSupply()).to.equal(0);
            expect(await longVoucher['balanceOf(address)'](receiver0.address)).to.equal(0);

            // ERC3525
            await expect(longVoucher.slotOf(tokenId)).to.be.reverted;
            await expect(longVoucher['balanceOf(uint256)'](tokenId)).to.be.reverted;

            expect(await longVoucher.tokenSupplyInSlot(slot)).to.equal(0);
        });

        it('burn approve', async function () {
            await longVoucher.connect(owner).addSlotManager(slotManager0.address, []);

            const slot = 1;
            const uintsToMint = ethers.utils.parseEther("1.0");

            // claim slot
            await longVoucher.connect(slotManager0).claimSlot(slot);

            // mint with slotManager0
            await longVoucher.connect(slotManager0).mint(receiver0.address, slot, uintsToMint);
            const tokenId = await longVoucher.tokenOfOwnerByIndex(receiver0.address, 0);
            await longVoucher.connect(receiver0)['approve(address,uint256)'](receiver1.address, tokenId);

            // burn
            const tx = await longVoucher.connect(receiver1).burn(tokenId);
            const receipt = await tx.wait();

            // ERC3525 TransferValue event
            // event TransferValue(uint256 indexed _fromTokenId, uint256 indexed _toTokenId, uint256 _value);
            const transferValueEvent = receipt.events[0];
            expect(transferValueEvent.event).to.equal("TransferValue");
            expect(transferValueEvent.args._fromTokenId).to.equal(tokenId);
            expect(transferValueEvent.args._toTokenId).to.equal(0);
            expect(transferValueEvent.args._value).to.equal(uintsToMint);

            // SlotChanged event by _createSlot
            const slotChangedEvent1 = receipt.events[1];
            expect(slotChangedEvent1.event).to.equal("SlotChanged");
            expect(slotChangedEvent1.args._tokenId).to.equal(tokenId);
            expect(slotChangedEvent1.args._oldSlot).to.equal(slot);
            expect(slotChangedEvent1.args._newSlot).to.equal(0); //

            // ERC721 Transfer event
            const transferEvent = receipt.events[2];
            expect(transferEvent.event).to.equal("Transfer");
            expect(transferEvent.args._from).to.equal(receiver0.address);
            expect(transferEvent.args._to).to.equal(ethers.constants.AddressZero);


            // check 
            // ERC721
            expect(await longVoucher.totalSupply()).to.equal(0);
            expect(await longVoucher['balanceOf(address)'](receiver0.address)).to.equal(0);

            // ERC3525
            await expect(longVoucher.slotOf(tokenId)).to.be.reverted;
            await expect(longVoucher['balanceOf(uint256)'](tokenId)).to.be.reverted;

            expect(await longVoucher.tokenSupplyInSlot(slot)).to.equal(0);
        });
    });

    describe('view methods', function () {

        it('contractURI/slotURI/tokenURL', async function () {
            await longVoucher.connect(owner).addSlotManager(slotManager0.address, []);
            const slot = 1;
            const uintsToMint = ethers.utils.parseEther("1.0");

            // claim slot
            await longVoucher.connect(slotManager0).claimSlot(slot);

            // mint with slotManager0
            await longVoucher.connect(slotManager0).mint(receiver0.address, slot, uintsToMint);
            const tokenId = await longVoucher.tokenOfOwnerByIndex(receiver0.address, 0);

            expect(await longVoucher.contractURI()).to.equal("");
            expect(await longVoucher.slotURI(slot)).to.equal("");
            expect(await longVoucher.tokenURI(tokenId)).to.equal("");

            // deploy and set MetadataDescriptor
            const descriptorFactory = await ethers.getContractFactory('TestOnlyMetadataDescriptor');
            const descriptor = await descriptorFactory.deploy();
            // setMetadataDescriptor
            await longVoucher.connect(owner).setMetadataDescriptor(descriptor.address);

            const contractURI = "this is long voucher contract";
            await descriptor.setContractURI(contractURI);
            expect(await longVoucher.contractURI()).to.equal(contractURI);

            const slotURI = "this is slot 1";
            descriptor.setSlotURI(slot, slotURI);
            expect(await longVoucher.slotURI(slot)).to.equal(slotURI);

            const tokenURI = "this is token 1";
            descriptor.setTokenURI(tokenId, tokenURI);
            expect(await longVoucher.tokenURI(tokenId)).to.equal(tokenURI);
        });

    });

    describe('ISLotManager', function () {

        it('onValueTransfer', async function () {
            const slotManagerFactory = await ethers.getContractFactory('TestOnlySlotManager');
            const slotManager = await slotManagerFactory.deploy(longVoucher.address);

            await longVoucher.connect(owner).addSlotManager(slotManager.address, []);
            const slot = 1;
            const uintsToMint = ethers.utils.parseEther("1.0");

            // claim slot
            await slotManager.connect(owner).claimSlot(slot);

            // mint 
            await slotManager.mint(receiver0.address, slot, uintsToMint);
            const tokenId = await longVoucher.tokenOfOwnerByIndex(receiver0.address, 0);

            let beforeValueTransfer = await slotManager.beforeValueTransfer_();
            expect(beforeValueTransfer.from_).to.equal(ethers.constants.AddressZero);
            expect(beforeValueTransfer.to_).to.equal(receiver0.address);
            expect(beforeValueTransfer.fromTokenId_).to.equal(0);
            expect(beforeValueTransfer.toTokenId_).to.equal(tokenId);
            expect(beforeValueTransfer.slot_).to.equal(slot);
            expect(beforeValueTransfer.value_).to.equal(uintsToMint);

            let afterValueTransfer = await slotManager.afterValueTransfer_();
            expect(beforeValueTransfer.from_).to.equal(ethers.constants.AddressZero);
            expect(beforeValueTransfer.to_).to.equal(receiver0.address);
            expect(beforeValueTransfer.fromTokenId_).to.equal(0);
            expect(beforeValueTransfer.toTokenId_).to.equal(tokenId);
            expect(beforeValueTransfer.slot_).to.equal(slot);
            expect(beforeValueTransfer.value_).to.equal(uintsToMint);


            // transfer to receiver1
            await longVoucher.connect(receiver0)['transferFrom(address,address,uint256)'](receiver0.address, receiver1.address, tokenId);
            beforeValueTransfer = await slotManager.beforeValueTransfer_();
            expect(beforeValueTransfer.from_).to.equal(receiver0.address);
            expect(beforeValueTransfer.to_).to.equal(receiver1.address);
            expect(beforeValueTransfer.fromTokenId_).to.equal(tokenId);
            expect(beforeValueTransfer.toTokenId_).to.equal(tokenId);
            expect(beforeValueTransfer.slot_).to.equal(slot);
            expect(beforeValueTransfer.value_).to.equal(uintsToMint);

            afterValueTransfer = await slotManager.afterValueTransfer_();
            expect(afterValueTransfer.from_).to.equal(receiver0.address);
            expect(afterValueTransfer.to_).to.equal(receiver1.address);
            expect(afterValueTransfer.fromTokenId_).to.equal(tokenId);
            expect(afterValueTransfer.toTokenId_).to.equal(tokenId);
            expect(afterValueTransfer.slot_).to.equal(slot);
            expect(afterValueTransfer.value_).to.equal(uintsToMint);
        });

    });
});