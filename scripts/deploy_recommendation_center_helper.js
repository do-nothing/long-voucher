// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  // console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // ProductCenterHelper
  const factory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = factory.attach("0xcef0c3D9FD0594F639d31858eec5BE7075822Feb");
  // console.log("Deployed RecommendationCenterHelper at: " + helper.address);
  // console.log(await recommendationCenter.consumerCount())
  console.log(await recommendationCenter.consumerByIndex(1))

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
