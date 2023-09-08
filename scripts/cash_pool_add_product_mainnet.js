// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers, network } = require("hardhat");

const CASH_POOL_ADDRESS = "0xEAdc30f6A9a950B819b1DEd8d6255A2a5Ed1A616";

async function main() {
    const [owner] = await ethers.getSigners();

    console.log("Owner :", owner.address);
    // console.log("Owner balance:", (await owner.getBalance()).toString());

    const simpleCashPoolFactory = await ethers.getContractFactory('SimpleCashPool');
    const simpleCashPool = simpleCashPoolFactory.attach(CASH_POOL_ADDRESS);

    await simpleCashPool.connect(owner).addProduct(20230716);
    // await simpleCashPool.connect(owner).addProduct(20230602);
    // console.log(await simpleCashPool.isSupported(20230702))
    // console.log(await simpleCashPool.isSupported(20230602))
    // const count = await simpleCashPool.productCount();
    // for (i = 0; i< count; i++) {
    //     console.log(await simpleCashPool.productIdByIndex(i))
    // }

    console.log("Done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

