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
const REFERRER_EARNINGS_RATIO = ethers.utils.parseEther("0.2");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // LongVoucher
  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = await longVoucherFactory.deploy(LONGVOUCHER_NAME, LONGVOUCHER_SYMBOL, LONGVOUCHER_DECIMALS, deployer.address);
  console.log("Deployed LongVoucher at: " + longVoucher.address);

  // LongVoucherMetadataDescriptor
  const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
  const metadataDescriptor = await upgrades.deployProxy(metadataDescriptorFactory, [longVoucher.address, deployer.address]);
  console.log("Deployed LongVoucherMetadataDescriptor at: " + metadataDescriptor.address);

  // LongVoucher.setMetadataDescriptor
  await longVoucher.connect(deployer).setMetadataDescriptor(metadataDescriptor.address);
  console.log("Set LongVoucher's LongVoucherMetadataDescriptor");

  // Recommendation
  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = await upgrades.deployProxy(recommendationFactory, [longVoucher.address, QUALIFICATION_SLOT, deployer.address]);
  console.log("Deployed Recommendation at: " + recommendation.address);

  await longVoucher.connect(deployer).addSlotManager(recommendation.address, [QUALIFICATION_SLOT]);
  console.log("Added Recommendation as a slot manager");

  // RecommendationCenter
  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = await upgrades.deployProxy(recommendationCenterFactory, [longVoucher.address, recommendation.address, REFERRER_EARNINGS_SLOT, deployer.address]);
  console.log("Deployed RecommendationCenter at: " + recommendationCenter.address);

  // ProductCenter
  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = await upgrades.deployProxy(productCenterFactory, [longVoucher.address, recommendationCenter.address, "0x2b3ef6906429b580b7b2080de5ca893bc282c225", deployer.address]);
  console.log("Deployed ProductCenter at: " + productCenter.address);

  // 
  await longVoucher.connect(deployer).addSlotManager(recommendationCenter.address, [REFERRER_EARNINGS_SLOT]);
  console.log("Added RecommendationCenter as a slot manager");

  // add ProductCenter as slot manager
  await longVoucher.connect(deployer).addSlotManager(productCenter.address, []);
  console.log("Added ProductCenter as a slot manager");

  // add ProductCenter as RecommendationCenter Consumer
  await recommendationCenter.connect(deployer).addConsumer(productCenter.address, REFERRER_EARNINGS_RATIO);
  console.log("Added ProductCenter as consumer of RecommendationCenter");

  // TieredInterestRate
  const tieredInterestRateFactory = await ethers.getContractFactory('TieredInterestRate');
  const tieredInterestRate = await tieredInterestRateFactory.connect(deployer).deploy();
  console.log("Deployed TieredInterestRate at: " + tieredInterestRate.address);

  // ProductCenterDescriptor
  const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
  const productCenterDescriptor = await upgrades.deployProxy(productCenterDescriptorFactory, [longVoucher.address]);
  console.log("Deployed ProductCenterDescriptor at: " + productCenterDescriptor.address);

  //  set metadata provider for ProductCenter
  await metadataDescriptor.setMetadataProvider(productCenter.address, productCenterDescriptor.address);
  console.log("Set ProductCenterDescriptor to LongVoucherMetaDescriptor");

  // VoucherSVG
  const voucherSVGFactory = await ethers.getContractFactory('VoucherSVG');
  const voucherSVG = await voucherSVGFactory.deploy(longVoucher.address);
  console.log("Deployed VoucherSVG at: " + voucherSVG.address);

  // set VoucherSVG to ProductCenterDescriptor 
  await productCenterDescriptor.setProductCenterVoucherSVG(productCenter.address, voucherSVG.address);
  console.log("set VoucherSVG to ProductCenterDescriptor");

  // QualSVG
  const qualSVGFactory = await ethers.getContractFactory('QualSVG');
  const qualSVG = await qualSVGFactory.deploy();
  console.log("Deployed QualSVG at: " + qualSVG.address);

  // EarningsSVG
  const earningsSVGFactory = await ethers.getContractFactory('EarningsSVG');
  const earningsSVG = await earningsSVGFactory.deploy(longVoucher.address);
  console.log("Deployed EarningsSVG at: " + earningsSVG.address);

  // PlainMetadataProvider
  const plainMetadataProviderFactory = await ethers.getContractFactory('PlainMetadataProvider');

  // PlainMetadataProvider for Recommendation
  const plainMetadataProvider1 = await plainMetadataProviderFactory.deploy("LongFil Recommendation Qualification", "", "", qualSVG.address);
  console.log("Deployed PlainMetadataProvider for Recommendation at: " + plainMetadataProvider1.address);

  // PlainMetadataProvider for RecommendationCenter
  const plainMetadataProvider2 = await plainMetadataProviderFactory.deploy("LongFil Recommendation Earnings Voucher", "", "", earningsSVG.address);
  console.log("Deployed PlainMetadataProvider for RecommendationCenter at: " + plainMetadataProvider2.address);

  //  set metadata provider for Recommendation
  await metadataDescriptor.setMetadataProvider(recommendation.address, plainMetadataProvider1.address);
  console.log("Set MetadataProvider for Recommendation");

  //  set metadata provider for RecommendationCenter
  await metadataDescriptor.setMetadataProvider(recommendationCenter.address, plainMetadataProvider2.address);
  console.log("Set MetadataProvider for RecommendationCenter");

  // LongVoucherHelper
  const longVoucherHelperFactory = await ethers.getContractFactory('LongVoucherHelper');
  const longVoucherHelper = await longVoucherHelperFactory.deploy(longVoucher.address);
  console.log("Deployed LongVoucherHelper at: " + longVoucherHelper.address);

  // ProductCenterHelper
  const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
  const productCenterHelper = await productCenterHelperFactory.connect(deployer).deploy(longVoucher.address);
  console.log("Deployed ProductCenterHelper at: " + productCenterHelper.address);

  // ProductCenterHelper
  const factory = await ethers.getContractFactory('RecommendationCenterHelper');
  const helper = await factory.connect(deployer).deploy();
  console.log("Deployed RecommendationCenterHelper at: " + helper.address);

  const FILFORWARDER_ADDRESS = "0x2b3ef6906429b580b7b2080de5ca893bc282c225";
  const simpleCashPoolFactory = await ethers.getContractFactory('SimpleCashPool');
  const simpleCashPool = await upgrades.deployProxy(simpleCashPoolFactory, [longVoucher.address, FILFORWARDER_ADDRESS, deployer.address]);
  console.log("Deployed SimpleCashPool at: " + simpleCashPool.address);


  console.log("\n");
  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

