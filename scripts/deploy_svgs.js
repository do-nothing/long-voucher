// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Deployer balance:", (await deployer.getBalance()).toString());

  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0x8899ffF856A1811c69E3b26d9fFa40C85579A864");

  const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
  const metadataDescriptor = metadataDescriptorFactory.attach("0x0BE2F61F4A839cC1Eb0e4765BE48480d637D8366");

  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach("0x1B8885d24f7C6dA7652EA234097456409b414F7a");

  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = recommendationCenterFactory.attach("0x06E93ccDAac0F5bA3A41D8CDcf4ffCCCDad932A9");

  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = productCenterFactory.attach("0x3512EfC6f44EdAD4fA67628C0C6030E4e8C4a821");

  const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
  const productCenterDescriptor = productCenterDescriptorFactory.attach("0xf3c1c8f7Fba0Cec4a8211685A8C2b885c235BE8E");

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
  const plainMetadataProvider1 = await plainMetadataProviderFactory.deploy("LongFil Recommendation", "", "", qualSVG.address);
  console.log("Deployed PlainMetadataProvider for Recommendation at: " + plainMetadataProvider1.address);

  // PlainMetadataProvider for RecommendationCenter
  const plainMetadataProvider2 = await plainMetadataProviderFactory.deploy("LongFil Recommendation Center", "", "", earningsSVG.address);
  console.log("Deployed PlainMetadataProvider for RecommendationCenter at: " + plainMetadataProvider2.address);

  //  set metadata provider for Recommendation
  await metadataDescriptor.setMetadataProvider(recommendation.address, plainMetadataProvider1.address);
  console.log("Set MetadataProvider for Recommendation");

  //  set metadata provider for RecommendationCenter
  await metadataDescriptor.setMetadataProvider(recommendationCenter.address, plainMetadataProvider2.address);
  console.log("Set MetadataProvider for RecommendationCenter");

  console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
