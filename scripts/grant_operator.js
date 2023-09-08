// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

// const PRODUCT_CENTER_ADDRESS = "0xcAf6BC6A1a800C6EB784D66A984552687Ae6461d";
// const PRODUCT_CENTER_ADDRESS = "0xBf6F9a061cb75AdbfD27717e3d650C93B72F2CCC";
const PRODUCT_CENTER_ADDRESS = "0xdb31e47e8938078a52878f2e396affdacf3157da"; // test only
// const PRODUCT_CENTER_ADDRESS = "0x0f1e1d17957DfE28ac1472D893e1a06e3605dDBA"; // hyperspace
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const CASHIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cashier"));
// const OPERATOR = "0xb42A59B7401569a8Fe0F439458ea8BdE18b44D1b";
// const OPERATOR = "0x99CDfE64eC2AC177a005B6a90220F0B0f5a38375";
// const OPERATOR = "0x99CDfE64eC2AC177a005B6a90220F0B0f5a38375";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // await helpers.setBalance(OPERATOR, ethers.utils.parseEther("100").toHexString())
  // console.log(await helpers.mine(10))

  
  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = productCenterFactory.attach(PRODUCT_CENTER_ADDRESS);

  await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, "0xe9A03bd355E9951C76722D411DDD47589C93eEF0");
  console.log("Granted operator role");

  // await productCenter.connect(deployer).grantRole(CASHIER_ROLE, "0xb8a96a3a1c220c9a2e100f3af668a7dd15f282b0");
  // console.log("Granted cashier role");

  // console.log(await helpers.mine(10))
  // console.log("latest block: " + await helpers.time.latestBlock())

  // console.log(await productCenter.hasRole(OPERATOR_ROLE, OPERATOR));
  // console.log(await productCenter.hasRole(CASHIER_ROLE, OPERATOR));

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
