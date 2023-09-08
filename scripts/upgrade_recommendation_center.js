// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenterV2');
  const upgraded = await upgrades.upgradeProxy("0xcef0c3D9FD0594F639d31858eec5BE7075822Feb", recommendationCenterFactory);
  console.log("upgraded Recommendation at: " + upgraded.address);

  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  upgraded2 = await upgrades.upgradeProxy("0xcE5F09b5983DB5bCf41e50D160999AF24FB267b6", recommendationFactory);
  recommendation = recommendationFactory.attach("0xcE5F09b5983DB5bCf41e50D160999AF24FB267b6");
  console.log("upgraded Recommendation at: " + upgraded2.address);

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
