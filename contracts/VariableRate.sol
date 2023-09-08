// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IInterestRate.sol";
import "./utils/StringConverter.sol";

contract VariableRate is IInterestRate {
    uint256 constant SCALE = 1e36;

    // 30 secs per block
    uint256 constant BLOCKS_PER_DAY = (24 * 3600) / 30;
    uint256 constant BLOCKS_PER_YEAR = BLOCKS_PER_DAY * 365;

    uint256[] recordPoints;
    mapping(uint256 => uint256) aprs;

    function setAPR(uint256 apr) external {
        recordPoints.push() = block.number;
        aprs[block.number] = apr;
    }

    function getCurrentAPR() public view returns (uint256) {
        uint256 lastPoint = recordPoints[recordPoints.length - 1];
        return aprs[lastPoint];
    }

    function getCompositeRate(uint256 beginBlock, uint256 endBlock)
        public
        view
        returns (uint256)
    {
        uint256 processPoint = 0;
        uint256 processRate = 0;

        if (beginBlock < recordPoints[0]) {
            processPoint = recordPoints[0];
        } else {
            processPoint = beginBlock;
        }

        for (uint256 i = 1; i < recordPoints.length; i++) {
            if (processPoint > endBlock) {
                break;
            }
            if (processPoint > recordPoints[i]) {
                continue;
            }

            uint256 duration = endBlock > recordPoints[i]
                ? (recordPoints[i] - processPoint)
                : (endBlock - processPoint);
            processPoint = recordPoints[i];

            uint256 durationRate = ((aprs[0] * SCALE) / 100 / BLOCKS_PER_YEAR) *
                duration;
            processRate += durationRate;
        }
        return processRate;
    }

    function calculate(
        uint256 principal,
        uint256 beginSubscriptionBlock,
        uint256 endSubscriptionBlock,
        uint256 beginBlock,
        uint256 endBlock
    ) external view override returns (uint256) {
        uint256 compositeRate = getCompositeRate(beginBlock, endBlock);
        uint256 result = (principal * compositeRate) / SCALE;

        beginSubscriptionBlock;
        endSubscriptionBlock;
        return result;
    }

    function nowAPR(
        uint256 beginSubscriptionBlock,
        uint256 endSubscriptionBlock
    ) external view override returns (string memory) {
        uint256 apr = getCurrentAPR();
        bytes memory aprStr = StringConverter.uint2decimal(apr, 2);

        beginSubscriptionBlock;
        endSubscriptionBlock;
        return string(abi.encodePacked(aprStr, "%"));
    }

    function getRecordPoints() public view virtual returns (string memory) {
        string memory result = "[";
        for (uint256 i = 0; i < recordPoints.length; i++) {
            string memory points = StringConverter.toString(recordPoints[i]);
            if (i != 0) {
                result = string.concat(result, ",");
            }
            result = string.concat(result, points);
        }
        return string.concat(result, "]");
    }
}
