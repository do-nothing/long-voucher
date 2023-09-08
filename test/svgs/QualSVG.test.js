
const { expect } = require('chai');
const { ethers, waffle } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe('QualSVG', function () {
    let interestRate;

    beforeEach(async () => {
        const svgFactory = await ethers.getContractFactory('QualSVG');
        svg = await svgFactory.deploy();
    });

    describe('test', function () {
        it('test', async function () {
            console.log(ethers.utils.toUtf8String(await svg.generateSVG(1)))
        });

    });
});