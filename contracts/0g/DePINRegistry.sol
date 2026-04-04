// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DePINRegistry {
    struct DePINDevice {
        uint256 agentId;
        string deviceName;
        string deviceType;
        string capacity;
        string pricePerUnit;
        uint256 registeredAt;
        bool active;
    }

    mapping(address => DePINDevice) public devices;
    address[] private _activeDevices;

    error AlreadyRegistered();

    event DeviceRegistered(address indexed device, uint256 agentId, string deviceName);

    function registerDevice(
        uint256 agentId,
        string calldata deviceName,
        string calldata deviceType,
        string calldata capacity,
        string calldata pricePerUnit
    ) external {
        if (devices[msg.sender].registeredAt != 0) revert AlreadyRegistered();
        devices[msg.sender] = DePINDevice(agentId, deviceName, deviceType, capacity, pricePerUnit, block.timestamp, true);
        _activeDevices.push(msg.sender);
        emit DeviceRegistered(msg.sender, agentId, deviceName);
    }

    function getActiveDevices() external view returns (address[] memory) {
        return _activeDevices;
    }

    function getDevice(address addr) external view returns (DePINDevice memory) {
        return devices[addr];
    }

    function totalDevices() external view returns (uint256) {
        return _activeDevices.length;
    }
}
