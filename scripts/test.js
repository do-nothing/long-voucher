// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

// mainnet
const ADDRESSES = {
  LongVoucher: "0x138553d5041fffbe1E26A7Ba1fB318B66875b318",
  LongVoucherMetadataDescriptor: "0x4357438a4102d56E28B8f9fefe8EE31dDA7D7c55",
  Recommendation: "0x19c3cD3957E02d4D839EFdD82BDd64F32E907daC",
  RecommendationCenter: "0xFB076865A6214bc4eaA61B9152C8B0111472F488",
  ProductCenter: "0xcAf6BC6A1a800C6EB784D66A984552687Ae6461d",
  ProductCenterDescriptor: "0x7ade06C468a7167A54b256639b4dC2eC5C7eAEfB",
  VoucherSVG: "0x1805a5F4D62F8Ade17eDfFa12239C51D39F24205",
  QualSVG: "0x934f2DF38C7F6F275341ED5BF60d9252D04e4949",
  EarningsSVG: "0x282BAb089Ddf19d9B9459b34111f5Ac3460B1F6F",
  LongVoucherHelper: "0x1761E493f4bC37854B2eD2AE9356CFC381dDff70",
  ProductCenterHelper: "0xe2224c2De0f305f6cE00DD24833FAD6161F3EFF9",
  RecommendationCenterHelper: "0xb2416683708Bf1a114A9bC7A6145636B98af8b86",
  SimpleCashPool: "0xEAdc30f6A9a950B819b1DEd8d6255A2a5Ed1A616",
}

// hyperspace
// const ADDRESSES = {
//   LongVoucher: "0x0866439f4b8157a7031F1918d0eAC9cAA4933443",
//   LongVoucherMetadataDescriptor: "0x090feBBFB0F33B3c14b691EFF12A244D723D6397",
//   Recommendation: "0x262a305De600C59D2d07171A5E23dac1fc83Ca76",
//   RecommendationCenter: "0x01B831a3CB911306FCd272fb2A26E58D9DD015F5",
//   ProductCenter: "0x0f1e1d17957DfE28ac1472D893e1a06e3605dDBA",
//   TieredInterestRate: "0x617aC3336FD6Bdbe59737f4bD6b5d3712C2EF1b6",
//   ProductCenterDescriptor: "0xfce0a3beB53d9aa398f3f56f5FFCE2628e640D6A",
//   VoucherSVG: "0x2474c208d743358f186C859814b240d1dBbC3CAF",
//   LongVoucherHelper: "0x0ABD2E34f796a55498DbebA31c052c5D16A4caCF",
//   ProductCenterHelper: "0x92127c526218Ae6847484d99e72E6Aa15185523f",
//   RecommendationCenterHelper: "0xCbF054E244fD6E76c46Bb4a8168504A56296B05A",
// }

// calibration
// const ADDRESSES = {
//   LongVoucher: "0x1FDd4bEB419EC870d558939213B1305146833929",
//   LongVoucherMetadataDescriptor: "0x4D1C686273956CB563BC3dF79799cFEF73811c3D",
//   Recommendation: "0xe9F173913b6458bE1b37aeb5C09C7C8E1D0791a7",
//   RecommendationCenter: "0x1eD80567ed8387D110Be9c7bE6cBc0e3270b72a9",
//   ProductCenter: "0x4C6d7c35C1eCCCD3C219F4A7beb501d1C451013A",
//   TieredInterestRate: "0xd9D9C23b822531d62D70F050234656975fCC8497",
//   ProductCenterDescriptor: "0x68BD615a2d4BC154C49f5EB1769C0Fe3C02f1C6c",
//   VoucherSVG: "0x34Cfb4c826Ab677FD8d9f90c1B9fFea87459Ca3A",
//   QualSVG: "0x6dbbbAe065A551bCfA2Bc6FbF585843098c79F1B",
//   EarningsSVG: "0x8B9Dfd2b932a293fa5eA60736Ddc48cBa724eE94",
//   LongVoucherHelper: "0xC19485fB0fEf9795F9Fa40558b33dB569C7C6a22",
//   ProductCenterHelper: "0x6711C98b856D5531bE62B24eDe59d41AD4feCa93",
//   RecommendationCenterHelper: "0xa21485a2353b44C6585685aFC275ecA203AC85Bc",
// }


const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("admin"));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const CASHIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cashier"));

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  // console.log("Deployer balance:", (await deployer.getBalance()).toString());


  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach(ADDRESSES.LongVoucher);

  // await longVoucher.addSlotManager(deployer.address, [33]);
  // await longVoucher.mint(deployer.address, 33, ethers.utils.parseEther("100"));

  const metadataDescriptorFactory = await ethers.getContractFactory('LongVoucherMetadataDescriptor');
  const metadataDescriptor = metadataDescriptorFactory.attach(ADDRESSES.LongVoucherMetadataDescriptor);

  const recommendationFactory = await ethers.getContractFactory('Recommendation');
  const recommendation = recommendationFactory.attach(ADDRESSES.Recommendation);

  const recommendationCenterFactory = await ethers.getContractFactory('RecommendationCenter');
  const recommendationCenter = recommendationCenterFactory.attach(ADDRESSES.RecommendationCenter);

  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = productCenterFactory.attach(ADDRESSES.ProductCenter);

  // const voucherSVGFactory = await ethers.getContractFactory('VoucherSVG');
  // const voucherSVG = voucherSVGFactory.attach(ADDRESSES.VoucherSVG);

  const productCenterDescriptorFactory = await ethers.getContractFactory('ProductCenterDescriptor');
  const productCenterDescriptor = productCenterDescriptorFactory.attach(ADDRESSES.ProductCenterDescriptor);

  const productCenterHelperFactory = await ethers.getContractFactory('ProductCenterHelper');
  const productCenterHelper = productCenterHelperFactory.attach(ADDRESSES.ProductCenterHelper);

  const longVoucherHelperFactory = await ethers.getContractFactory('LongVoucherHelper');
  const longVoucherHelper = longVoucherHelperFactory.attach(ADDRESSES.LongVoucherHelper);

  const recommendationCenterHelperFactory = await ethers.getContractFactory('RecommendationCenterHelper');
  const recommendationCenterHelper = recommendationCenterHelperFactory.attach(ADDRESSES.RecommendationCenterHelper);

  console.log(await recommendationCenterHelper.getReferredProductList(recommendationCenter.address, "0x892749EE118549257593737c029a16FeB97ea9A0"))
  console.log(await recommendationCenter.getDistributedEarnings("0x892749EE118549257593737c029a16FeB97ea9A0"))
  console.log(await recommendationCenter['accruedEarnings(address)']("0x892749EE118549257593737c029a16FeB97ea9A0"))

  console.log("Done")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
