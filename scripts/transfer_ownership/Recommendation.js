// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

const OWNER_PK = "5d576a85e772f2228cef90c7ca6f1aa012214be8a61a18f7a9587a90405378b8";

async function main() {
  const provider = new ethers.providers.Web3Provider(network.provider)
  const owner = new ethers.Wallet(OWNER_PK, provider);

  console.log("Owner :", owner.address);
  // console.log("Owner balance:", (await owner.getBalance()).toString());

  // Recommendation
  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach("0x19c3cD3957E02d4D839EFdD82BDd64F32E907daC");

  // await recommendation.connect(owner).transferOwnership("0x78d6E23a286e12cDd8A0dDd4026E4ACB813A97C8");
  console.log(await recommendation.pendingOwner())
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
