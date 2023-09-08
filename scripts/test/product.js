// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const CASHIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cashier"));

async function main() {
  const [deployer, receiver] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);

  const productCenterFactory = await ethers.getContractFactory('TestOnlyProductCenter');
  const productCenter = productCenterFactory.attach("0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0");

  // await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, deployer.address);
  // await productCenter.connect(deployer).grantRole(CASHIER_ROLE, deployer.address);
  // console.log("Granted operator role");
  // const blockNumber = await helpers.time.latestBlock();
  // const productParameters = {
  //   // 总额度
  //   totalQuota: ethers.utils.parseEther("100"),
  //   // 最小认购金额
  //   minSubscriptionAmount: ethers.utils.parseEther("1"),
  //   // 认购起始区块
  //   beginSubscriptionBlock: blockNumber + 1,
  //   // 认购结束区块
  //   endSubscriptionBlock: blockNumber + 101,
  //   // 区块数表示的最少持有时长
  //   minHoldingDuration: 0,
  //   // 利息
  //   interestRate: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  //   cashPool: ethers.constants.AddressZero
  // };
  // await productCenter.create(3, productParameters);
  // console.log("created product")

  /// subscribe
  // await productCenter.connect(deployer).subscribe(3, {value: ethers.utils.parseEther("10")})

  /// cancel 
  // await productCenter.cancelSubscription(3, ethers.utils.parseEther("20"), deployer.address);

  /// loan
  await productCenter.loan(3, ethers.utils.parseEther("2"), receiver.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
