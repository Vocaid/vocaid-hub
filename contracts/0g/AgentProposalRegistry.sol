// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IIdentityRegistry.sol";

/// @title AgentProposalRegistry — On-chain agent prediction proposals with owner approval
/// @notice Agents submit prediction bets/market proposals; owners approve+execute in one tx
interface IResourcePrediction {
    function placeBet(uint256 marketId, uint8 side) external payable;
    function createMarket(string calldata question, uint256 resolutionTime) external returns (uint256);
}

contract AgentProposalRegistry {
    enum ProposalType { BET, CREATE_MARKET }
    enum Status { PENDING, APPROVED, REJECTED, EXPIRED }

    struct Proposal {
        uint256 agentId;
        ProposalType pType;
        bytes data;
        Status status;
        uint256 createdAt;
    }

    IIdentityRegistry public immutable identityRegistry;
    IResourcePrediction public immutable resourcePrediction;
    uint256 public constant EXPIRY = 1 days;

    Proposal[] public proposals;

    event ProposalSubmitted(uint256 indexed proposalId, uint256 indexed agentId, ProposalType pType);
    event ProposalApproved(uint256 indexed proposalId, uint256 indexed agentId);
    event ProposalRejected(uint256 indexed proposalId, uint256 indexed agentId);

    error NotAuthorized();
    error NotOwner();
    error NotPending();
    error Expired();

    constructor(address identityRegistry_, address resourcePrediction_) {
        identityRegistry = IIdentityRegistry(identityRegistry_);
        resourcePrediction = IResourcePrediction(resourcePrediction_);
    }

    /// @notice Agent submits a prediction proposal
    /// @param agentId ERC-8004 agent identity
    /// @param pType BET or CREATE_MARKET
    /// @param data ABI-encoded params: BET = (uint256 marketId, uint8 side, uint256 amount), CREATE_MARKET = (string question, uint256 resolutionTime)
    function submitProposal(uint256 agentId, ProposalType pType, bytes calldata data) external {
        if (!identityRegistry.isAuthorizedOrOwner(msg.sender, agentId)) revert NotAuthorized();

        proposals.push(Proposal({
            agentId: agentId,
            pType: pType,
            data: data,
            status: Status.PENDING,
            createdAt: block.timestamp
        }));

        emit ProposalSubmitted(proposals.length - 1, agentId, pType);
    }

    /// @notice Owner approves and executes a proposal in one transaction
    function approveAndExecute(uint256 proposalId) external payable {
        Proposal storage p = proposals[proposalId];
        if (p.status != Status.PENDING) revert NotPending();
        if (block.timestamp > p.createdAt + EXPIRY) revert Expired();
        if (identityRegistry.ownerOf(p.agentId) != msg.sender) revert NotOwner();

        p.status = Status.APPROVED;

        if (p.pType == ProposalType.BET) {
            (uint256 marketId, uint8 side, ) = abi.decode(p.data, (uint256, uint8, uint256));
            resourcePrediction.placeBet{value: msg.value}(marketId, side);
        } else {
            (string memory question, uint256 resolutionTime) = abi.decode(p.data, (string, uint256));
            resourcePrediction.createMarket(question, resolutionTime);
        }

        emit ProposalApproved(proposalId, p.agentId);
    }

    /// @notice Owner rejects a proposal
    function reject(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.status != Status.PENDING) revert NotPending();
        if (identityRegistry.ownerOf(p.agentId) != msg.sender) revert NotOwner();

        p.status = Status.REJECTED;
        emit ProposalRejected(proposalId, p.agentId);
    }

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 agentId, ProposalType pType, bytes memory data, Status status, uint256 createdAt
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.agentId, p.pType, p.data, p.status, p.createdAt);
    }
}
