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

  // ProductCenter
  const productCenterV2Factory = await ethers.getContractFactory('ProductCenter');
  // const upgraded = await upgrades.upgradeProxy("0x0f1e1d17957DfE28ac1472D893e1a06e3605dDBA", productCenterV2Factory);
  // const upgraded = await upgrades.upgradeProxy("0x95401dc811bb5740090279Ba06cfA8fcF6113778", productCenterV2Factory);
  const productCenterV2 = productCenterV2Factory.attach("0x0f1e1d17957DfE28ac1472D893e1a06e3605dDBA");
  // await productCenterV2.initialize("0x2B3ef6906429b580b7b2080de5CA893BC282c225");
  console.log(await productCenterV2.longVoucher());
  console.log(await productCenterV2.filForwarder());
  // console.log("upgraded ProductCenter at: " + upgraded.address);

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
