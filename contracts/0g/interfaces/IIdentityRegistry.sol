// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IIdentityRegistry — ERC-8004 Identity Registry interface
/// @notice Minimal interface for interacting with deployed IdentityRegistryUpgradeable
interface IIdentityRegistry {
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    function register() external returns (uint256 agentId);
    function register(string memory agentURI) external returns (uint256 agentId);
    function register(string memory agentURI, MetadataEntry[] memory metadata) external returns (uint256 agentId);

    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory);
    function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external;
    function setAgentURI(uint256 agentId, string calldata newURI) external;
    function getAgentWallet(uint256 agentId) external view returns (address);
    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external;
    function isAuthorizedOrOwner(address spender, uint256 agentId) external view returns (bool);

    // ERC-721 subset
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
