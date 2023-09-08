// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const PRODUCT_CENTER_ADDRESS = "0xdb31e47e8938078a52878f2e396affdacf3157da"; // cal

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0xBa5843d8165Ae08AEAee7A1BB284d6eA8F35f336");

  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = recommendationCenterFactory.attach("0xcef0c3D9FD0594F639d31858eec5BE7075822Feb");

  const productCenterFactory = await ethers.getContractFactory('TestOnlyProductCenter');
  const productCenter = productCenterFactory.attach(PRODUCT_CENTER_ADDRESS);

  // console.log(await productCenter.recommendationCenter())
  // console.log(await longVoucher.ownerOf(3))
  // console.log(await longVoucher.managerOf(10001))
  // console.log(await recommendationCenter.getReferrerEarningsRatio(productCenter.address))
  await longVoucher['transferFrom(uint256,address,uint256)'](3, deployer.address, ethers.utils.parseEther("0.5"));

  // await productCenter.subscribe(1024, {value: ethers.utils.parseEther("2")});
  // console.log(await productCenter.getProductParameters(111100))

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
