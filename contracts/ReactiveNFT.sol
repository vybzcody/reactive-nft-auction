// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title ReactiveNFT
 * @dev ERC721 NFT contract with DiceBear API for deterministic image generation
 */
contract ReactiveNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    // Token ID counter
    uint256 private _tokenIdCounter;

    // Available DiceBear styles
    enum Style {
        Avataaars,
        Bottts,
        Lorelei,
        Notionists,
        FunEmoji,
        PixelArt
    }

    mapping(Style => string) private styleNames;
    mapping(Style => string) private styleURIs;

    event NFTMinted(
        uint256 indexed tokenId,
        address indexed minter,
        Style style,
        string imageURI
    );

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {
        styleURIs[Style.Avataaars] = "https://api.dicebear.com/7.x/avataaars/svg?seed=";
        styleURIs[Style.Bottts] = "https://api.dicebear.com/7.x/bottts/svg?seed=";
        styleURIs[Style.Lorelei] = "https://api.dicebear.com/7.x/lorelei/svg?seed=";
        styleURIs[Style.Notionists] = "https://api.dicebear.com/7.x/notionists/svg?seed=";
        styleURIs[Style.FunEmoji] = "https://api.dicebear.com/7.x/fun-emoji/svg?seed=";
        styleURIs[Style.PixelArt] = "https://api.dicebear.com/7.x/pixel-art/svg?seed=";
        
        styleNames[Style.Avataaars] = "Avataaars";
        styleNames[Style.Bottts] = "Bottts";
        styleNames[Style.Lorelei] = "Lorelei";
        styleNames[Style.Notionists] = "Notionists";
        styleNames[Style.FunEmoji] = "Fun Emoji";
        styleNames[Style.PixelArt] = "Pixel Art";
    }

    function mint() public returns (uint256 tokenId) {
        return mintWithStyle(Style.Avataaars);
    }

    function mintWithStyle(Style style) public returns (uint256 tokenId) {
        tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        string memory metadataUri = _generateMetadataUri(tokenId, style);
        _setTokenURI(tokenId, metadataUri);
        string memory imageUrl = _generateImageUrl(tokenId, style);
        
        emit NFTMinted(tokenId, msg.sender, style, imageUrl);
        return tokenId;
    }

    function mintTo(address to, Style style) public onlyOwner returns (uint256 tokenId) {
        tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        
        string memory metadataUri = _generateMetadataUri(tokenId, style);
        _setTokenURI(tokenId, metadataUri);
        string memory imageUrl = _generateImageUrl(tokenId, style);
        
        emit NFTMinted(tokenId, to, style, imageUrl);
        return tokenId;
    }

    function batchMint(uint256 count) public returns (uint256[] memory tokenIds) {
        require(count > 0, "Count must be positive");
        require(count <= 10, "Max 10 per batch");
        
        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = _tokenIdCounter++;
            Style style = Style(uint8(tokenIds[i] % 6)); // 6 styles: 0-5
            _safeMint(msg.sender, tokenIds[i]);
            
            string memory metadataUri = _generateMetadataUri(tokenIds[i], style);
            _setTokenURI(tokenIds[i], metadataUri);
            string memory imageUrl = _generateImageUrl(tokenIds[i], style);
            
            emit NFTMinted(tokenIds[i], msg.sender, style, imageUrl);
        }
        return tokenIds;
    }

    function _generateImageUrl(uint256 tokenId, Style style) internal view returns (string memory) {
        return string(
            abi.encodePacked(
                styleURIs[style],
                Strings.toString(tokenId),
                "&backgroundColor=transparent&size=400"
            )
        );
    }

    function _generateMetadataUri(uint256 tokenId, Style style) internal view returns (string memory) {
        string memory imageUrl = _generateImageUrl(tokenId, style);
        string memory styleName = styleNames[style];
        string memory name = string(abi.encodePacked("Reactive NFT #", Strings.toString(tokenId)));
        
        string memory json = string(
            abi.encodePacked(
                '{"name":"', name,
                '","description":"A reactive NFT auctioned on Somnia Network.',
                '","image":"', imageUrl,
                '","attributes":[',
                '{"trait_type":"Token ID","value":"', Strings.toString(tokenId), '"}',
                ',{"trait_type":"Style","value":"', styleName, '"}',
                ',{"trait_type":"Collection","value":"Reactive NFT"}',
                ']}'
            )
        );
        
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                _base64Encode(bytes(json))
            )
        );
    }

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        bytes memory alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        bytes memory result = new bytes(((data.length + 2) / 3) * 4);
        
        for (uint i = 0; i < data.length; i += 3) {
            uint idx = i / 3 * 4;
            uint a = i < data.length ? uint8(data[i]) : 0;
            uint b = i + 1 < data.length ? uint8(data[i + 1]) : 0;
            uint c = i + 2 < data.length ? uint8(data[i + 2]) : 0;
            uint triple = (a << 16) + (b << 8) + c;
            
            result[idx] = alphabet[(triple >> 18) & 0x3F];
            result[idx + 1] = alphabet[(triple >> 12) & 0x3F];
            result[idx + 2] = alphabet[(triple >> 6) & 0x3F];
            result[idx + 3] = alphabet[triple & 0x3F];
        }
        
        uint mod = data.length % 3;
        if (mod == 1) { result[result.length - 1] = "="; result[result.length - 2] = "="; }
        else if (mod == 2) { result[result.length - 1] = "="; }
        
        return string(result);
    }

    function totalSupply() public view override(ERC721Enumerable) returns (uint256) {
        return super.totalSupply();
    }

    function tokenByIndex(uint256 index) public view override(ERC721Enumerable) returns (uint256) {
        return super.tokenByIndex(index);
    }

    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            result[i] = tokenOfOwnerByIndex(owner, i);
        }
        return result;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
