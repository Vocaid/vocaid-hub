// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IIdentityRegistry.sol";
import "./interfaces/IValidationRegistry.sol";

/// @title GPUProviderRegistry — Registers GPU providers with ERC-8004 identity + TEE metadata
/// @notice Links 0G compute providers to ERC-8004 agent identity with hardware attestation data
contract GPUProviderRegistry {
    struct GPUProvider {
        uint256 agentId;
        string gpuModel;
        string teeType;
        bytes32 attestationHash;
        uint256 registeredAt;
        bool active;
    }

    IIdentityRegistry public immutable identityRegistry;
    IValidationRegistry public immutable validationRegistry;

    mapping(address => GPUProvider) public providers;
    address[] public providerList;

    event ProviderRegistered(address indexed provider, uint256 indexed agentId, string gpuModel, string teeType);
    event ProviderDeactivated(address indexed provider, uint256 indexed agentId);
    event AttestationUpdated(address indexed provider, bytes32 attestationHash);

    error NotAgentOwner();
    error AlreadyRegistered();
    error NotRegistered();

    constructor(address identityRegistry_, address validationRegistry_) {
        identityRegistry = IIdentityRegistry(identityRegistry_);
        validationRegistry = IValidationRegistry(validationRegistry_);
    }

    error EmptyGpuModel();
    error EmptyTeeType();

    function registerProvider(
        uint256 agentId,
        string calldata gpuModel,
        string calldata teeType,
        bytes32 attestationHash
    ) external {
        if (bytes(gpuModel).length == 0) revert EmptyGpuModel();
        if (bytes(teeType).length == 0) revert EmptyTeeType();
        if (!identityRegistry.isAuthorizedOrOwner(msg.sender, agentId)) revert NotAgentOwner();
        if (providers[msg.sender].registeredAt != 0) revert AlreadyRegistered();

        providers[msg.sender] = GPUProvider({
            agentId: agentId,
            gpuModel: gpuModel,
            teeType: teeType,
            attestationHash: attestationHash,
            registeredAt: block.timestamp,
            active: true
        });
        providerList.push(msg.sender);

        emit ProviderRegistered(msg.sender, agentId, gpuModel, teeType);
    }

    function updateAttestation(bytes32 newAttestationHash) external {
        if (providers[msg.sender].registeredAt == 0) revert NotRegistered();
        providers[msg.sender].attestationHash = newAttestationHash;
        emit AttestationUpdated(msg.sender, newAttestationHash);
    }

    function deactivate() external {
        GPUProvider storage p = providers[msg.sender];
        if (p.registeredAt == 0) revert NotRegistered();
        p.active = false;
        emit ProviderDeactivated(msg.sender, p.agentId);
    }

    function getProvider(address provider) external view returns (GPUProvider memory) {
        return providers[provider];
    }

    function getActiveProviders() external view returns (address[] memory) {
        return this.getActiveProvidersPaginated(0, 100);
    }

    function getActiveProvidersPaginated(uint256 offset, uint256 limit) external view returns (address[] memory active) {
        uint256 total = providerList.length;
        if (offset >= total) return new address[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        // First pass: count active in range
        uint256 count;
        for (uint256 i = offset; i < end; i++) {
            if (providers[providerList[i]].active) count++;
        }

        // Second pass: collect
        active = new address[](count);
        uint256 idx;
        for (uint256 i = offset; i < end; i++) {
            if (providers[providerList[i]].active) {
                active[idx++] = providerList[i];
            }
        }
    }

    function totalProviders() external view returns (uint256) {
        return providerList.length;
    }
}
