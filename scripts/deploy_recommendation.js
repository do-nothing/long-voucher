// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

const LONG_VOUCHER_ADDRESS = "0x1FDd4bEB419EC870d558939213B1305146833929"; // hyperspace

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach(LONG_VOUCHER_ADDRESS);

  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = await recommendationFactory.deploy();
  console.log("Deployed Recommendation at: " + recommendation.address);

  // add ProductCenter as slot manager
  await longVoucher.connect(deployer).addSlotManager(recommendation.address);
  console.log("Added Recommendation as a slot manager");

  await recommendation.initialize(LONG_VOUCHER_ADDRESS, deployer.address);
  console.log("Initialize Recommendation");

  // console.log("hasRole: " + await productCenter.hasRole(OPERATOR_ROLE, OPERATOR));

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
