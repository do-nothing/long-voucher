// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("admin"));
const OPERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("operator"));
const CASHIER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("cashier"));

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);

  const productCenterFactory = await ethers.getContractFactory('ProductCenter');
  const productCenter = productCenterFactory.attach('0xcAf6BC6A1a800C6EB784D66A984552687Ae6461d');

  // grant admin role 
  // await productCenter.grantRole(ADMIN_ROLE, "0x78d6E23a286e12cDd8A0dDd4026E4ACB813A97C8");
  // console.log(`granted admin role to 0x78d6E23a286e12cDd8A0dDd4026E4ACB813A97C8`)
  // console.log(await productCenter.hasRole(ADMIN_ROLE, "0x78d6E23a286e12cDd8A0dDd4026E4ACB813A97C8"));


  // grant operator role
  // await productCenter.connect(deployer).grantRole(OPERATOR_ROLE, ACCOUNT);

  // revoke operator role
  // await productCenter.connect(deployer).revokeRole(OPERATOR_ROLE, ACCOUNT);

  // console.log(await productCenter.hasRole(OPERATOR_ROLE, "0xffdB67Ea7C2B85110C3bf1d9c3bf23C1Bb86f7a5"));
  console.log(await productCenter.hasRole(CASHIER_ROLE, "0xa4261253C6370cC80054DD5a6603E55518f11928"));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
