// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const OPERATOR = "0xb8A96A3a1c220C9a2E100f3aF668A7Dd15f282b0";

const DEFAULT_REFERRER_EARNINGS_RATIO = ethers.utils.parseEther("0.2");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // LongVoucher
  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0xC19485fB0fEf9795F9Fa40558b33dB569C7C6a22");
  // const longVoucher = longVoucherFactory.attach("0x9A676e781A523b5d0C0e43731313A708CB607508");

  // LongVoucherMetadataDescriptor
  const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
  const metadataDescriptor = metadataDescriptorFactory.attach("0x6711C98b856D5531bE62B24eDe59d41AD4feCa93");
  // const metadataDescriptor = metadataDescriptorFactory.attach("0x0B306BF915C4d645ff596e518fAf3F9669b97016");

  // RecommendationCenter
  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = recommendationCenterFactory.attach("0x73195Ab405F3E89A252500d4Afa8B4E84B515E58");
  // const recommendationCenter = recommendationCenterFactory.attach("0x59b670e9fA9D0A427751Af201D676719a970857b");

  // ProductCenter
  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = await productCenterFactory.connect(deployer).deploy(longVoucher.address, deployer.address, recommendationCenter.address);
  console.log("Deployed ProductCenter at: " + productCenter.address);

  // add ProductCenter as slot manager
  await longVoucher.connect(deployer).addSlotManager(productCenter.address);
  console.log("Added ProductCenter as a slot manager");

  // TieredInterestRate
  const tieredInterestRateFactory = await ethers.getContractFactory('TieredInterestRate');
  const tieredInterestRate = await tieredInterestRateFactory.connect(deployer).deploy();
  console.log("Deployed TieredInterestRate at: " + tieredInterestRate.address);

  // ProductCenterDescriptor
  const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
  const productCenterDescriptor = await productCenterDescriptorFactory.deploy();
  console.log("Deployed ProductCenterDescriptor at: " + productCenterDescriptor.address);
  await productCenterDescriptor.initialize(longVoucher.address);
  console.log("Initialized ProductCenterDescriptor");

  // ProductCenterHelper
  const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
  const productCenterHelper = await productCenterHelperFactory.connect(deployer).deploy(longVoucher.address);
  console.log("Deployed ProductCenterHelper at: " + productCenterHelper.address);

  //  set metadata provider for ProductCenter
  await metadataDescriptor.setMetadataProvider(productCenter.address, productCenterDescriptor.address);
  console.log("Set ProductCenterDescriptor to LongVoucherMetaDescriptor");

  // grant operator
  await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, OPERATOR);
  console.log("Granted operator role");

  await productCenterDescriptor.connect(deployer).setProductCenterInfo(productCenter.address, { name: "Testing Product Center", desc: "Product center for testing", link: "www.longfil.io" })

  // console.log("hasRole: " + await productCenter.hasRole(OPERATOR_ROLE, OPERATOR));

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
