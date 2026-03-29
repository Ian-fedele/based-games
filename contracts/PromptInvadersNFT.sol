// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PromptInvadersNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    uint256 public mintFee = 0.0002 ether;
    uint256 public mintCooldown = 60;
    mapping(address => uint256) public lastMintTime;

    event ScoreMinted(address indexed player, uint256 tokenId, uint256 score, string tokenURI);

    constructor() ERC721("Prompt Invaders", "PINV") Ownable(msg.sender) {}

    function mintScore(string calldata _tokenURI, uint256 _score) external payable returns (uint256) {
        require(msg.value >= mintFee, "Insufficient fee");
        require(block.timestamp >= lastMintTime[msg.sender] + mintCooldown, "Cooldown active");

        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        lastMintTime[msg.sender] = block.timestamp;

        emit ScoreMinted(msg.sender, tokenId, _score, _tokenURI);
        return tokenId;
    }

    function setMintFee(uint256 _fee) external onlyOwner {
        require(_fee <= 0.01 ether, "Fee too high");
        mintFee = _fee;
    }

    function setCooldown(uint256 _cd) external onlyOwner {
        require(_cd <= 86400, "Cooldown too long");
        mintCooldown = _cd;
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
