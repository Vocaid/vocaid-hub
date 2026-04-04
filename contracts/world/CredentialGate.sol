// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IWorldID} from "./IWorldID.sol";
import {ByteHasher} from "./ByteHasher.sol";

/// @title CredentialGate — World ID on-chain verification for Vocaid
/// @notice Verifies World ID ZK proofs, stores nullifiers, maps address -> verified
contract CredentialGate {
    using ByteHasher for bytes;

    IWorldID public immutable worldId;
    uint256 public immutable groupId = 1;
    uint256 public immutable externalNullifierHash;

    mapping(uint256 => bool) public nullifierHashes;
    mapping(address => bool) public verified;

    event Verified(address indexed user, uint256 nullifierHash);

    error DuplicateNullifier(uint256 nullifierHash);
    error SignalMustBeCaller();

    constructor(IWorldID _worldId, string memory _appId, string memory _actionId) {
        worldId = _worldId;
        externalNullifierHash = abi
            .encodePacked(abi.encodePacked(_appId).hashToField(), _actionId)
            .hashToField();
    }

    function verifyAndRegister(
        address signal,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (signal != msg.sender) revert SignalMustBeCaller();
        if (nullifierHashes[nullifierHash]) revert DuplicateNullifier(nullifierHash);

        worldId.verifyProof(
            root,
            groupId,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            externalNullifierHash,
            proof
        );

        nullifierHashes[nullifierHash] = true;
        verified[signal] = true;
        emit Verified(signal, nullifierHash);
    }

    function isVerified(address _addr) external view returns (bool) {
        return verified[_addr];
    }
}
