// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deployContract } = require("@nomiclabs/hardhat-ethers/types");

async function main() {
  const [deployer,,, receiver] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);

  const longVoucherFactory = await ethers.getContractFactory('LongVoucher');
  const longVoucher = longVoucherFactory.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

  // console.log(await longVoucher['balanceOf(uint256)'](1))
  // console.log(await longVoucher['balanceOf(uint256)'](8))
  // console.log(await longVoucher['balanceOf(uint256)'](9))

  await longVoucher.connect(deployer)['transferFrom(uint256,address,uint256)'](8, receiver.address, ethers.utils.parseEther("0.5"))
  // await longVoucher.connect(deployer)['transferFrom(uint256,uint256,uint256)'](8, 10, ethers.utils.parseEther("0.5"))
  // await longVoucher.connect(receiver).burn(10)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
