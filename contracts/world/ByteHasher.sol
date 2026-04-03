// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library ByteHasher {
    /// @dev Converts bytes to a uint256 in the finite field used by Semaphore.
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(value))) >> 8;
    }
}
