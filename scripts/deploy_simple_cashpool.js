// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

// const LONG_VOUCHER_ADDRESS = "0x0866439f4b8157a7031F1918d0eAC9cAA4933443"; // hyperspace
const LONG_VOUCHER_ADDRESS = "0x138553d5041fffbe1E26A7Ba1fB318B66875b318"; // mainnet
const FILFORWARDER_ADDRESS = "0x2b3ef6906429b580b7b2080de5ca893bc282c225";
// const OWNER_ADDRESS = "0x422ebcFf76e91F4E072D5FFE80CcB30b20101814";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const simpleCashPoolFactory = await ethers.getContractFactory('SimpleCashPool');
  const simpleCashPool = await upgrades.deployProxy(simpleCashPoolFactory, [LONG_VOUCHER_ADDRESS, FILFORWARDER_ADDRESS, deployer.address]);
  console.log("Deployed SimpleCashPool at: " + simpleCashPool.address);

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
