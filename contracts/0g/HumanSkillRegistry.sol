// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HumanSkillRegistry {
    struct HumanProvider {
        uint256 agentId;
        string skillName;
        string skillLevel;
        string hourlyRate;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => HumanProvider) public providers;
    address[] private _activeProviders;

    error AlreadyRegistered();

    event ProviderRegistered(address indexed provider, uint256 agentId, string skillName);

    function registerProvider(
        uint256 agentId,
        string calldata skillName,
        string calldata skillLevel,
        string calldata hourlyRate
    ) external {
        if (providers[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        providers[msg.sender] = HumanProvider(agentId, skillName, skillLevel, hourlyRate, block.timestamp, true);
        _activeProviders.push(msg.sender);
        emit ProviderRegistered(msg.sender, agentId, skillName);
    }

    function getActiveProviders() external view returns (address[] memory) {
        return _activeProviders;
    }

    function getProvider(address addr) external view returns (HumanProvider memory) {
        return providers[addr];
    }

    function totalProviders() external view returns (uint256) {
        return _activeProviders.length;
    }
}
