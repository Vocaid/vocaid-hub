// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ResourcePrediction — Prediction markets for GPU resource pricing
/// @notice Native-token denominated prediction markets (0G A0GI) for compute resource pricing
contract ResourcePrediction is ReentrancyGuard {
    enum MarketState { Active, Resolved, Cancelled }
    enum Outcome { None, Yes, No }

    struct Market {
        string question;
        uint256 resolutionTime;
        MarketState state;
        Outcome winningOutcome;
        uint256 yesPool;
        uint256 noPool;
        address creator;
    }

    address public immutable oracle;
    uint256 public constant MIN_BET = 0.001 ether;
    uint256 public constant ORACLE_TIMEOUT = 7 days;
    uint256 public nextMarketId;

    mapping(uint256 => Market) public markets;
    // marketId => user => Outcome => amount
    mapping(uint256 => mapping(address => mapping(Outcome => uint256))) public bets;

    event MarketCreated(uint256 indexed marketId, string question, uint256 resolutionTime, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, Outcome side, uint256 amount);
    event MarketResolved(uint256 indexed marketId, Outcome winningOutcome);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed bettor, uint256 payout);

    error MarketNotActive();
    error MarketNotResolved();
    error MarketNotCancelled();
    error ResolutionTimePassed();
    error ResolutionTimeNotReached();
    error InvalidOutcome();
    error NoBet();
    error OnlyOracle();
    error ZeroAmount();
    error BelowMinBet();
    error NotTimedOut();

    constructor(address oracle_) {
        oracle = oracle_;
    }

    function createMarket(string calldata question, uint256 resolutionTime) external returns (uint256 marketId) {
        if (resolutionTime <= block.timestamp) revert ResolutionTimePassed();

        marketId = nextMarketId++;
        markets[marketId] = Market({
            question: question,
            resolutionTime: resolutionTime,
            state: MarketState.Active,
            winningOutcome: Outcome.None,
            yesPool: 0,
            noPool: 0,
            creator: msg.sender
        });

        emit MarketCreated(marketId, question, resolutionTime, msg.sender);
    }

    function placeBet(uint256 marketId, Outcome side) external payable nonReentrant {
        Market storage m = markets[marketId];
        if (m.state != MarketState.Active) revert MarketNotActive();
        if (block.timestamp >= m.resolutionTime) revert ResolutionTimePassed();
        if (side != Outcome.Yes && side != Outcome.No) revert InvalidOutcome();
        if (msg.value < MIN_BET) revert BelowMinBet();

        bets[marketId][msg.sender][side] += msg.value;

        if (side == Outcome.Yes) {
            m.yesPool += msg.value;
        } else {
            m.noPool += msg.value;
        }

        emit BetPlaced(marketId, msg.sender, side, msg.value);
    }

    function resolveMarket(uint256 marketId, Outcome outcome) external {
        if (msg.sender != oracle) revert OnlyOracle();
        Market storage m = markets[marketId];
        if (m.state != MarketState.Active) revert MarketNotActive();
        if (block.timestamp < m.resolutionTime) revert ResolutionTimeNotReached();
        if (outcome != Outcome.Yes && outcome != Outcome.No) revert InvalidOutcome();

        m.state = MarketState.Resolved;
        m.winningOutcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        if (m.state != MarketState.Resolved) revert MarketNotResolved();

        uint256 userBet = bets[marketId][msg.sender][m.winningOutcome];
        if (userBet == 0) revert NoBet();

        bets[marketId][msg.sender][m.winningOutcome] = 0;

        uint256 totalPool = m.yesPool + m.noPool;
        uint256 winningPool = m.winningOutcome == Outcome.Yes ? m.yesPool : m.noPool;
        uint256 payout = Math.mulDiv(userBet, totalPool, winningPool);

        emit WinningsClaimed(marketId, msg.sender, payout);
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "transfer failed");
    }

    function cancelMarket(uint256 marketId) external {
        if (msg.sender != oracle) revert OnlyOracle();
        Market storage m = markets[marketId];
        if (m.state != MarketState.Active) revert MarketNotActive();

        m.state = MarketState.Cancelled;
        emit MarketCancelled(marketId);
    }

    function claimRefund(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        if (m.state != MarketState.Cancelled) revert MarketNotCancelled();

        uint256 yesBet = bets[marketId][msg.sender][Outcome.Yes];
        uint256 noBet = bets[marketId][msg.sender][Outcome.No];
        uint256 total = yesBet + noBet;
        if (total == 0) revert NoBet();

        bets[marketId][msg.sender][Outcome.Yes] = 0;
        bets[marketId][msg.sender][Outcome.No] = 0;

        (bool ok, ) = msg.sender.call{value: total}("");
        require(ok, "transfer failed");
    }

    function cancelStale(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.state != MarketState.Active) revert MarketNotActive();
        if (block.timestamp <= m.resolutionTime + ORACLE_TIMEOUT) revert NotTimedOut();

        m.state = MarketState.Cancelled;
        emit MarketCancelled(marketId);
    }

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }
}
