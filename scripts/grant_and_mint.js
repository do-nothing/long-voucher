// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const ACCOUNT = '0xb8a96a3a1c220c9a2e100f3af668a7dd15f282b0';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  // console.log("Deployer balance:", (await deployer.getBalance()).toString());

  // const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  // const longVoucher = longVoucherFactory.attach("0x138553d5041fffbe1E26A7Ba1fB318B66875b318");

  // const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  // const productCenter = productCenterFactory.attach('0xcAf6BC6A1a800C6EB784D66A984552687Ae6461d');

  // Recommendation
  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach("0xb808E2E3bAb51F6a40505c4df4BBa9e42A1f940E");

  // grant operator role
  // await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, ACCOUNT);
  // console.log("Granted operator role");

  // const longVoucherHelperFactory = await ethers.getContractFactory('LongVoucherHelper');
  // const longVoucherHelper = longVoucherHelperFactory.attach("0x1761E493f4bC37854B2eD2AE9356CFC381dDff70");
  //  console.log(await longVoucherHelper.tokensOfOwnerBySlot("0xbe6530809911dAFf49bF2B446b3eC5C331fDD0fb", 20));


  // const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
  // const productCenterHelper = productCenterHelperFactory.attach("0xe2224c2De0f305f6cE00DD24833FAD6161F3EFF9");

  // console.log(await productCenter.hasRole(OPERATOR_ROLE, "0xb8a96a3a1c220c9a2e100f3af668a7dd15f282b0"));
  // console.log(await productCenterHelper.getProductIdsInSubscriptionStage(productCenter.address));


  // mint referrer qualification
  await recommendation.connect(deployer).mint("0xFDf46Fe6Ffa3fF7F355eA4A9f44C15f806F23cB3");
  console.log("Grant referrer qualification");

  // console.log("Is referrer: " + await recommendation.isReferrer(ACCOUNT));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
