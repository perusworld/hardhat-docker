// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SampleNFT is ERC721, Ownable {
  uint256 private _nextTokenId = 1;

  constructor(address initialOwner) ERC721("Hardhat Sample NFT", "HSNFT") Ownable(initialOwner) {}

  function mint(address to) external onlyOwner returns (uint256 tokenId) {
    tokenId = _nextTokenId++;
    _safeMint(to, tokenId);
  }

  function nextTokenId() external view returns (uint256) {
    return _nextTokenId;
  }
}
