// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers, upgrades } = require("hardhat");

const LONGVOUCHER_NAME = "LongFil Voucher";
const LONGVOUCHER_SYMBOL = "LongVoucher";
const LONGVOUCHER_DECIMALS = 18;

const QUALIFICATION_SLOT = 20;
const REFERRER_EARNINGS_SLOT = 21;
const REFERRER_EARNINGS_RATIO = ethers.utils.parseEther("0.1");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // LongVoucher
  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0x86AFF493137D12D3c5809BBA889D2222df319263");

  // LongVoucherMetadataDescriptor
  const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
  const metadataDescriptor = metadataDescriptorFactory.attach("0x584c60489832D56E53b3ed6b81649c26C55b1232");

  // RecommendationCenter
  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = recommendationCenterFactory.attach("0x1d257Fb3De1BA9BFB442ed2a04e95bE6D2e361DA");

  // ProductCenter
  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = await productCenterFactory.deploy();
  // const productCenter = productCenterFactory.attach("0x48B33FE7c14e98e702A1658Ad7092c88B6AD073B");
  await productCenter.initialize(longVoucher.address, recommendationCenter.address, "0x2b3ef6906429b580b7b2080de5ca893bc282c225", deployer.address);
  console.log("Deployed ProductCenter at: " + productCenter.address);

  // ProductCenterDescriptor
  const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
  // const productCenterDescriptor = productCenterDescriptorFactory.attach("0x0e0898a852E887739378969527862987ef7f6Cd8");
  const productCenterDescriptor = await upgrades.deployProxy(productCenterDescriptorFactory, [longVoucher.address]);
  console.log("Deployed ProductCenterDescriptor at: " + productCenterDescriptor.address);

  // add ProductCenter as slot manager
  await longVoucher.connect(deployer).addSlotManager(productCenter.address, []);
  console.log("Added ProductCenter as a slot manager");

  // add ProductCenter as RecommendationCenter Consumer
  await recommendationCenter.connect(deployer).addConsumer(productCenter.address, REFERRER_EARNINGS_RATIO);
  console.log("Added ProductCenter as consumer of RecommendationCenter");

  //  set metadata provider for ProductCenter
  await metadataDescriptor.setMetadataProvider(productCenter.address, productCenterDescriptor.address);
  console.log("Set ProductCenterDescriptor to LongVoucherMetaDescriptor");

  // VoucherSVG
  const voucherSVGFactory = await ethers.getContractFactory('VoucherSVG');
  const voucherSVG = voucherSVGFactory.attach("0x752dd0E20D8D83609E3E4161035EEc714A78Cd34");
  // console.log("Deployed VoucherSVG at: " + voucherSVG.address);

  // set VoucherSVG to ProductCenterDescriptor 
  await productCenterDescriptor.setProductCenterVoucherSVG(productCenter.address, voucherSVG.address);
  console.log("set VoucherSVG to ProductCenterDescriptor");
  console.log("\n");
  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

