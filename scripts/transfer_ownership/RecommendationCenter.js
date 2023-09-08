// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer :", deployer.address);

  const factory = await ethers.getContractFactory('RecommendationCenter');
  const contract = factory.attach("0xFB076865A6214bc4eaA61B9152C8B0111472F488");

  // await contract.transferOwnership("0x78d6E23a286e12cDd8A0dDd4026E4ACB813A97C8");
  // console.log(await contract.owner())
  console.log(await contract.pendingOwner())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
