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

  // LongVoucherMetadataDescriptor
  const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
  const metadataDescriptor = metadataDescriptorFactory.attach("0x6711C98b856D5531bE62B24eDe59d41AD4feCa93");

  // Recommendation
  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach("0x74Fa4441E7aD6a847E398A62Ec571dDC9a567a35");
  // const recommendation = await recommendationFactory.deploy();
  // console.log("Deployed Recommendation at: " + recommendation.address);
  // await longVoucher.connect(deployer).addSlotManager(recommendation.address);
  // console.log("Added Recommendation as a slot manager");

  // await recommendation.initialize(longVoucher.address, deployer.address);
  // console.log("Initialized Recommendation");

  // RecommendationCenter
  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  // const recommendationCenter = await recommendationCenterFactory.deploy();
  const recommendationCenter = recommendationCenterFactory.attach("0x0e0898a852E887739378969527862987ef7f6Cd8");
  // console.log("Deployed RecommendationCenter at: " + recommendationCenter.address);
  // await longVoucher.connect(deployer).addSlotManager(recommendationCenter.address);
  // console.log("Added RecommendationCenter as a slot manager");
  // await recommendationCenter.initialize(longVoucher.address, recommendation.address, DEFAULT_REFERRER_EARNINGS_RATIO, deployer.address);
  // console.log("Initialized RecommendationCenter");
  // console.log(await longVoucher.managerOf(23));

  // ProductCenter
  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = await productCenterFactory.connect(deployer).deploy(longVoucher.address, deployer.address, recommendationCenter.address);
  console.log("Deployed ProductCenter at: " + productCenter.address);

  // add ProductCenter as slot manager
  await longVoucher.connect(deployer).addSlotManager(productCenter.address);
  console.log("Added ProductCenter as a slot manager");

  // ProductCenterDescriptor
  const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
  const productCenterDescriptor = productCenterDescriptorFactory.attach("0xcef0c3D9FD0594F639d31858eec5BE7075822Feb");

  //  set metadata provider for ProductCenter
  await metadataDescriptor.setMetadataProvider(productCenter.address, productCenterDescriptor.address);
  console.log("Set ProductCenterDescriptor to LongVoucherMetaDescriptor");

  // grant operator
  await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, OPERATOR);
  console.log("Granted operator role");

  await productCenterDescriptor.connect(deployer).setProductCenterInfo(productCenter.address, { name: "Testing Product Center", desc: "Product center for testing", link: "www.longfil.io" })
  await recommendation.connect(deployer).mint(OPERATOR);

  // console.log("hasRole: " + await productCenter.hasRole(OPERATOR_ROLE, OPERATOR));

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
