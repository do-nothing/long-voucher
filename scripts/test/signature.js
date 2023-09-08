const { ethers } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    const signers = await ethers.getSigners();
    const referrer = signers[0];
    const referral = signers[3];

    const domain = {
        name: "LongFil Voucher",
        version: "1",
        chainId: 31337,
        verifyingContract: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    };
    // console.log(domain)
    const types = {
        Referral: [
            { name: 'referrer', type: 'address' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    let lastestTimestamp = await helpers.time.latest();
    let data = { referrer: referrer.address, deadline:  lastestTimestamp + 36000};
    let signature = await referral._signTypedData(domain, types, data);

    console.log(JSON.stringify({chainId: domain.chainId, referral: referral.address, referrer: referrer.address, deadline: data.deadline, signature}, undefined, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
