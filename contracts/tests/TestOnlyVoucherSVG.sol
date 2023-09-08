// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "../IVoucherSVG.sol";
import "../utils/StringConverter.sol";

contract TestOnlyVoucherSVG is IVoucherSVG {
    using StringConverter for uint128;
    using StringConverter for uint256;
    using StringConverter for bytes;

  struct SVGParams {
    uint256 bondsAmount;
    uint128 tokenId;
    uint128 slotId;
    uint8 bondsDecimals;
  }

  string private constant BG_COLOR_0 = "#186e6e";
  string private constant BG_COLOR_1 = "#111212";

  /// Admin functions

  /// View functions

  function generateSVG(uint256 _tokenId) external view override returns (bytes memory) {
    uint128 slotId = uint128(1000);

    SVGParams memory svgParams;
    svgParams.bondsAmount = 1 ether;
    svgParams.tokenId = uint128(_tokenId);
    svgParams.slotId = slotId;
    svgParams.bondsDecimals = 18;

    return _generateSVG(svgParams);
  }

  /// Internal functions

  function _generateSVG(SVGParams memory params) internal view virtual returns (bytes memory) {
    return
        abi.encodePacked(
          '<svg width="600px" height="400px" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">',
          _generateDefs(),
          '<g stroke-width="1" fill="none" fill-rule="evenodd" font-family="Arial">',
          _generateBackground(),
          _generateTitle(params),
          _generateLogo(),
          "</g>",
          "</svg>"
      );
  }

  function _generateDefs() internal pure returns (string memory) {
    return 
        string(
            abi.encodePacked(
                '<defs>',
                    '<linearGradient x1="0%" y1="75%" x2="100%" y2="30%" id="lg-1">',
                        '<stop stop-color="', BG_COLOR_1,'" offset="0%"></stop>',
                        '<stop stop-color="', BG_COLOR_0, '" offset="100%"></stop>',
                    '</linearGradient>',
                    '<rect id="path-2" x="16" y="16" width="568" height="368" rx="16"></rect>',
                    '<linearGradient x1="100%" y1="50%" x2="0%" y2="50%" id="lg-2">',
                        '<stop stop-color="#FFFFFF" offset="0%"></stop>',
                        '<stop stop-color="#FFFFFF" stop-opacity="0" offset="100%"></stop>',
                    '</linearGradient>', 
                    abi.encodePacked(
                        '<linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="lg-3">',
                            '<stop stop-color="#FFFFFF" offset="0%"></stop>',
                            '<stop stop-color="#FFFFFF" stop-opacity="0" offset="100%"></stop>',
                        '</linearGradient>',
                        '<linearGradient x1="100%" y1="50%" x2="35%" y2="50%" id="lg-4">',
                            '<stop stop-color="#FFFFFF" offset="0%"></stop>',
                            '<stop stop-color="#FFFFFF" stop-opacity="0" offset="100%"></stop>',
                        '</linearGradient>',
                        '<linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="lg-5">',
                            '<stop stop-color="#FFFFFF" offset="0%"></stop>',
                            '<stop stop-color="#FFFFFF" stop-opacity="0" offset="100%"></stop>',
                        '</linearGradient>'
                    ),
                    '<path id="text-path-a" d="M30 12 H570 A18 18 0 0 1 588 30 V370 A18 18 0 0 1 570 388 H30 A18 18 0 0 1 12 370 V30 A18 18 0 0 1 30 12 Z" />',
                '</defs>'
            )
        );
  }

  function _generateBackground() internal pure returns (string memory) {
    return 
        string(
            abi.encodePacked(
                '<rect fill="url(#lg-1)" x="0" y="0" width="600" height="400" rx="24"></rect>',
                '<g text-rendering="optimizeSpeed" opacity="0.5" font-family="Arial" font-size="10" font-weight="500" fill="#FFFFFF">',
                    '<text><textPath startOffset="-100%" xlink:href="#text-path-a">In Crypto We Trust<animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /></textPath></text>',
                    '<text><textPath startOffset="0%" xlink:href="#text-path-a">In Crypto We Trust<animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /></textPath></text>',
                    '<text><textPath startOffset="50%" xlink:href="#text-path-a">Powered by Solv Protocol<animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /></textPath></text>',
                    '<text><textPath startOffset="-50%" xlink:href="#text-path-a">Powered by Solv Protocol<animate additive="sum" attributeName="startOffset" from="0%" to="100%" begin="0s" dur="30s" repeatCount="indefinite" /></textPath></text>',
                '</g>',
                '<rect stroke="#FFFFFF" x="16.5" y="16.5" width="567" height="367" rx="16"></rect>',
                '<mask id="mask-3" fill="white">',
                    '<use xlink:href="#path-2"></use>',
                '</mask>',
                '<path d="M404,-41 L855,225 M165,100 L616,366 M427,-56 L878,210 M189,84 L640,350 M308,14 L759,280 M71,154 L522,420 M380,-27 L831,239 M143,113 L594,379 M286,28 L737,294 M47,169 L498,435 M357,-14 L808,252 M118,128 L569,394 M262,42 L713,308 M24,183 L475,449 M333,0 L784,266 M94,141 L545,407 M237,57 L688,323 M0,197 L451,463 M451,-69 L902,197 M214,71 L665,337 M665,57 L214,323 M902,197 L451,463 M569,0 L118,266 M808,141 L357,407 M640,42 L189,308 M878,183 L427,449 M545,-14 L94,252 M784,128 L333,394 M616,28 L165,294 M855,169 L404,435 M522,-27 L71,239 M759,113 L308,379 M594,14 L143,280 M831,154 L380,420 M498,-41 L47,225 M737,100 L286,366 M475,-56 L24,210 M713,84 L262,350 M451,-69 L0,197 M688,71 L237,337" stroke="url(#lg-2)" opacity="0.2" mask="url(#mask-3)"></path>'
            )
        );
  }

  function _generateTitle(SVGParams memory params) internal pure returns (string memory) {
    string memory tokenIdStr = params.tokenId.toString();
    uint256 tokenIdLeftMargin = 488 - 20 * bytes(tokenIdStr).length;

    bytes memory amount = _formatValue(params.bondsAmount, params.bondsDecimals);
    uint256 amountLeftMargin = 290 - 20 * amount.length;

    return 
      string(
        abi.encodePacked(
          '<g transform="translate(40, 40)" fill="#FFFFFF" fill-rule="nonzero">',
              '<text font-family="Arial" font-size="32">',
                  abi.encodePacked(
                      '<tspan x="', tokenIdLeftMargin.toString(), '" y="25"># ', tokenIdStr, '</tspan>'
                  ),
              '</text>',
              '<text font-family="Arial" font-size="64">',
                  abi.encodePacked(
                      '<tspan x="', amountLeftMargin.toString(), '" y="185">', amount, '</tspan>'
                  ),
              '</text>',
              '<text font-family="Arial" font-size="24"><tspan x="460" y="185">Units</tspan></text>',
              '<text font-family="Arial" font-size="24" font-weight="500"><tspan x="60" y="25"> SURF ISR Voucher</tspan></text>',
          '</g>'
        )
      );
  }

  function _generateLogo() internal pure returns (string memory) {
    return
      string(
        abi.encodePacked(
            '<g transform="translate(5, 0)" fill-rule="evenodd">',
            '<path d="M53.2 30.403c-4.876.398-10.899 2.96-14.234 6.056-4.899 4.547-7.256 9.029-8.295 15.766-.051.333-.069 1.03-.07 2.671l-.001 2.22.201 1.105c.456 2.507.669 3.324 1.324 5.106 1.485 4.028 3.81 7.335 7.175 10.202 2.755 2.347 5.765 3.915 9.444 4.921 1.921.525 2.566.639 4.431.78 5.183.394 10.191-.853 14.85-3.694 2.686-1.638 5.48-4.38 7.351-7.212 1.487-2.251 1.296-2.664-.79-1.704-2.284 1.05-6.29 2.577-9.111 3.474-5.071 1.611-8.317 2.164-12.775 2.172-5.646.012-10.194-1.271-13.278-3.744-2.404-1.929-3.661-4.031-3.926-6.571-.461-4.409 2.314-7.837 6.904-8.524 2.594-.389 3.633.111 1.901.913-2.864 1.326-3.918 2.161-4.648 3.681-.651 1.354-.512 3.253.341 4.673 1.489 2.479 6.026 4.6 11.306 5.288 1.398.181 1.531.091 2.771-1.891a56.576 56.576 0 0 1 1.299-1.967l1.348-1.934a132.466 132.466 0 0 1 2.744-3.751c1.026-1.345.993-1.429-1.011-2.636-3.084-1.859-5.809-3.551-6.758-4.199a154.481 154.481 0 0 0-1.506-1.014c-4.556-3.008-4.784-3.214-4.313-3.909.736-1.084 8.467-8.582 10.149-9.842 1.141-.856 1.479-.611.823.596-.607 1.119-3.456 5.464-4.472 6.819-1.551 2.072-1.532 2.172.651 3.336.359.191.955.539 1.325.773.37.234 1.022.629 1.449.877a103.515 103.515 0 0 1 1.85 1.115c.59.364 1.466.903 1.948 1.197.787.481 2.509 1.594 3.5 2.263 2.948 1.989 2.938 1.981 2.888 2.496-.044.45-.823 1.331-4.059 4.584-2.531 2.544-3.222 3.213-5.13 4.956-1.881 1.719-1.91 1.752-1.827 2.08.098.39 2.269.453 4.954.143l1.3-.151c1.748-.204 4.724-.729 6.1-1.077.22-.056.908-.211 1.529-.344a41.794 41.794 0 0 0 1.875-.449 85.531 85.531 0 0 1 1.946-.501c3.449-.849 4.479-1.187 4.829-1.586.751-.855 1.816-5.044 1.954-7.688.106-2.039.026-3.154-.411-5.7-1.205-7.014-5.678-13.329-12.022-16.974-1.868-1.073-3.825-1.846-6.4-2.527a57.674 57.674 0 0 0-2.525-.527c-.971-.178-3.551-.254-4.9-.144" fill="#fbc33c"/>',
            '</g>'
        )
      );
  }

  function _formatValue(uint256 value, uint8 decimals) private pure returns (bytes memory) {
    return value.uint2decimal(decimals).trim(decimals - 2).addThousandsSeparator();
  }
}