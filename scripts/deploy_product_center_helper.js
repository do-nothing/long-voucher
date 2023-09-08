// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

const LONG_VOUCHER_ADDRESS = "0x8899ffF856A1811c69E3b26d9fFa40C85579A864";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // ProductCenterHelper
  const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
  const productCenterHelper = await productCenterHelperFactory.connect(deployer).deploy(LONG_VOUCHER_ADDRESS);
  console.log("Deployed ProductCenterHelper at: " + productCenterHelper.address);

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
