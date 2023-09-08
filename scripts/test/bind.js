// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
  const [deployer, referral] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);

  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0x86AFF493137D12D3c5809BBA889D2222df319263");

  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach("0xcE5F09b5983DB5bCf41e50D160999AF24FB267b6");

  // await recommendation.mint(deployer.address);
  // console.log(await recommendation.isReferrer(deployer.address));


  const domain = {
    name: "LongFil Voucher",
    version: "1",
    chainId: 314159,
    verifyingContract: recommendation.address
  };
  // console.log(domain)
  const types = {
    Referral: [
      { name: 'referrer', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  // let lastestTimestamp = await helpers.time.latest();
  lastestTimestamp = 1691735753;
  let data = { referrer: deployer.address, deadline: lastestTimestamp + 36000 };
  let signature = await referral._signTypedData(domain, types, data);
  console.log(signature)
  signature = signature.substring(2);
  let r = "0x" + signature.substring(0, 64);
  let s = "0x" + signature.substring(64, 128);
  let v = parseInt(signature.substring(128, 130), 16);

  // bind non referral should fail
  let result = await recommendation['bind(address,uint256,uint8,bytes32,bytes32)'](data.referrer, data.deadline, v, r, s);
  console.log(result)

  // await helpers.setBalance("0xb3761b9b543ae397aBBe1dBD05A10D7D7a1768f3", ethers.utils.parseEther("100").toHexString())

  // console.log(await helpers.time.latestBlock())
  // await longVoucher.addSlotManager(deployer.address, [2]);
  // await longVoucher.connect(deployer).mint("0x90F79bf6EB2c4f870365E785982E1f101E93b906", 2, ethers.utils.parseEther("1"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
