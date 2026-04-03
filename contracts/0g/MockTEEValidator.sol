// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IValidationRegistry.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title MockTEEValidator — ECDSA signature-based TEE validation mock
/// @notice Validates GPU provider attestations via trusted signer (hackathon fallback for full DCAP)
contract MockTEEValidator {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    IValidationRegistry public immutable validationRegistry;
    address public immutable trustedSigner;

    event ValidationSubmitted(bytes32 indexed requestHash, uint8 response);

    error InvalidSignature();

    constructor(address validationRegistry_, address trustedSigner_) {
        validationRegistry = IValidationRegistry(validationRegistry_);
        trustedSigner = trustedSigner_;
    }

    function validate(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag,
        bytes calldata signature
    ) external {
        bytes32 digest = keccak256(abi.encodePacked(requestHash, response, responseHash))
            .toEthSignedMessageHash();
        if (digest.recover(signature) != trustedSigner) revert InvalidSignature();

        validationRegistry.validationResponse(requestHash, response, responseURI, responseHash, tag);
        emit ValidationSubmitted(requestHash, response);
    }
}
