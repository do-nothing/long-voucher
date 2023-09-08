// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

// const PRODUCT_CENTER_ADDRESS = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"; // localhost
const PRODUCT_CENTER_ADDRESS = "0xdb31e47e8938078a52878f2e396affdacf3157da"; // cal
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = productCenterFactory.attach(PRODUCT_CENTER_ADDRESS);

  // await helpers.mine(3);
  // const blockNumber = await helpers.time.latestBlock();
  // console.log(blockNumber)

  // await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, deployer.address);
  await productCenter.create(1024, {
    totalQuota: ethers.utils.parseEther("10"),
    minSubscriptionAmount: ethers.utils.parseEther("1"),
    beginSubscriptionBlock: 621730,
    endSubscriptionBlock: 621750,
    minHoldingDuration: 0,
    interestRate: "0x74Fa4441E7aD6a847E398A62Ec571dDC9a567a35"
  });

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
