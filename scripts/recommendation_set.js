// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const PRODUCT_CENTER_ADDRESS = "0x8DcdEf4747131E1e4749c541BE8dddC58EAc7ec6"; // cal

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0x86AFF493137D12D3c5809BBA889D2222df319263");

  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = recommendationCenterFactory.attach("0x1d257Fb3De1BA9BFB442ed2a04e95bE6D2e361DA");

  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach("0xcE5F09b5983DB5bCf41e50D160999AF24FB267b6");

  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = productCenterFactory.attach("0x8DcdEf4747131E1e4749c541BE8dddC58EAc7ec6");

  console.log(await productCenter.recommendationCenter())
  console.log(await longVoucher.ownerOf(3))
  console.log(await longVoucher.managerOf(10001))
  console.log(await recommendationCenter.getReferrerEarningsRatio(productCenter.address))
  await longVoucher['transferFrom(uint256,address,uint256)'](3, deployer.address, ethers.utils.parseEther("0.5"));

  // await productCenter.subscribe(1024, {value: ethers.utils.parseEther("2")});
  // console.log(await productCenter.getProductParameters(111100))
  await recommendation.mint("0x28874638e103D7957B07ab3C6ac006EB71168C18");
  await recommendation.b

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
