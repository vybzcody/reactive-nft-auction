// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";
import { ISomniaReactivityPrecompile, SomniaExtensions } from "@somnia-chain/reactivity-contracts/contracts/interfaces/ISomniaReactivityPrecompile.sol";

/**
 * @title ReactiveNFTAuction
 * @dev NFT Auction with sniper protection, bid history, proxy bidding, and custom metadata
 * @dev Implements on-chain reactivity for automated auction finalization and sniper detection
 */
contract ReactiveNFTAuction is IERC721Receiver, SomniaEventHandler {
    uint256 public constant EXTENSION_WINDOW = 120;
    uint256 public constant EXTENSION_DURATION = 120;
    uint256 public constant MIN_INCREMENT_BPS = 1000;
    uint256 public constant MIN_DURATION = 60;
    uint256 public constant MAX_DURATION = 86400;

    // Event topic signatures for on-chain reactivity
    bytes32 public constant SCHEDULE_SIG = keccak256("Schedule(uint256)");
    bytes32 public constant BID_PLACED_SIG = keccak256("BidPlaced(uint256,address,uint256,uint256,bool)");

    // Somnia Precompile address
    ISomniaReactivityPrecompile public constant PRECOMPILE = ISomniaReactivityPrecompile(SomniaExtensions.SOMNIA_REACTIVITY_PRECOMPILE_ADDRESS);

    struct Auction {
        uint256 tokenId;
        address nftContract;
        address seller;
        address highestBidder;
        uint256 highestBid;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        bool hasReactiveFinalization;
        uint256 reservePrice;
        bool reserveMet;
        uint256 cronSubId; // Subscription ID for auto-finalization
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
        bool isProxy;
    }

    struct ProxyBid {
        address bidder;
        uint256 maxBid;
        uint256 currentBid;
        bool active;
    }

    struct NFTMetadata {
        string imageURI;
        string name;
        string description;
        uint256 rarityScore;
        bool isCustom;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(uint256 => uint256) public auctionToSubscription;
    mapping(uint256 => uint256) public subscriptionToAuction;
    mapping(address => mapping(uint256 => uint256)) public nftAuction;
    
    // Enhanced mappings
    mapping(uint256 => mapping(address => ProxyBid)) public proxyBids;
    mapping(uint256 => NFTMetadata) public nftMetadata;

    uint256 public auctionCounter;
    uint256[] public activeAuctionIds;
    mapping(uint256 => bool) public isActiveAuction;

    // Events
    event AuctionCreated(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address seller,
        uint256 startTime,
        uint256 endTime,
        uint256 reservePrice
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 endTime,
        bool extended
    );

    event ProxyBidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 maxBid,
        uint256 currentBid
    );

    event AuctionExtended(uint256 indexed auctionId, uint256 oldEndTime, uint256 newEndTime);
    event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 amount, bool nftTransferred, bool paymentSent, bool reserveMet);
    event AuctionFinalizationScheduled(uint256 indexed auctionId, uint256 finalizeTime);
    event AuctionCancelled(uint256 indexed auctionId);
    event PaymentSent(uint256 indexed auctionId, address indexed seller, uint256 amount);
    event NFTTransferred(uint256 indexed auctionId, address indexed from, address indexed to, uint256 tokenId);
    event ReserveMet(uint256 indexed auctionId, uint256 bidAmount);
    event ReserveNotMet(uint256 indexed auctionId, uint256 highestBid);
    event BidRefunded(uint256 indexed auctionId, address indexed bidder, uint256 amount);

    // On-chain reactivity events
    event SniperDetected(uint256 indexed auctionId, address indexed bidder, uint256 indexed timestamp);
    event CronSubscriptionCreated(uint256 indexed auctionId, uint256 indexed subId, uint256 finalizeTime);
    event AuctionAutoFinalized(uint256 indexed auctionId);

    event NFTMetadataUpdated(
        uint256 indexed tokenId,
        string imageURI,
        string name,
        string description,
        bool isCustom
    );

    modifier auctionExists(uint256 auctionId) {
        require(auctions[auctionId].seller != address(0), "Auction does not exist");
        _;
    }

    modifier auctionActive(uint256 auctionId) {
        require(auctions[auctionId].seller != address(0), "Auction does not exist");
        require(!auctions[auctionId].finalized, "Auction already finalized");
        _;
    }

    modifier auctionBiddingOpen(uint256 auctionId) {
        require(auctions[auctionId].seller != address(0), "Auction does not exist");
        require(!auctions[auctionId].finalized, "Auction already finalized");
        require(block.timestamp < auctions[auctionId].endTime, "Auction already ended");
        _;
    }

    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 durationSeconds,
        uint256 reservePrice
    ) external returns (uint256 auctionId) {
        require(durationSeconds >= MIN_DURATION, "Duration too short");
        require(durationSeconds <= MAX_DURATION, "Duration too long");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not NFT owner");
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Contract not approved to transfer NFT"
        );

        auctionId = ++auctionCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + durationSeconds;

        auctions[auctionId] = Auction({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            highestBidder: address(0),
            highestBid: 0,
            startTime: startTime,
            endTime: endTime,
            finalized: false,
            hasReactiveFinalization: true,
            reservePrice: reservePrice,
            reserveMet: false,
            cronSubId: 0
        });

        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
        nftAuction[nftContract][tokenId] = auctionId;
        activeAuctionIds.push(auctionId);
        isActiveAuction[auctionId] = true;

        // Create cron subscription for auto-finalization at endTime
        // Convert endTime to milliseconds and subscribe to Schedule event
        uint256 finalizeTimeMs = endTime * 1000;
        uint256 subId = PRECOMPILE.subscribe(
            ISomniaReactivityPrecompile.SubscriptionData({
                eventTopics: [SCHEDULE_SIG, bytes32(0), bytes32(0), bytes32(0)],
                origin: address(0),
                caller: address(0),
                emitter: address(0),
                handlerContractAddress: address(this),
                handlerFunctionSelector: this.onEvent.selector,
                priorityFeePerGas: 0,
                maxFeePerGas: 10_000_000_000, // 10 gwei
                gasLimit: 3_000_000,
                isGuaranteed: true,
                isCoalesced: false
            })
        );
        auctions[auctionId].cronSubId = subId;

        emit AuctionCreated(auctionId, tokenId, nftContract, msg.sender, startTime, endTime, reservePrice);
        emit CronSubscriptionCreated(auctionId, subId, finalizeTimeMs);
    }

    function placeBid(uint256 auctionId) external payable auctionBiddingOpen(auctionId) {
        Auction storage auction = auctions[auctionId];
        uint256 minBid = auction.highestBid == 0 ? 0 :
            auction.highestBid + (auction.highestBid * MIN_INCREMENT_BPS / 10000);

        require(msg.value > minBid, "Bid must be at least 10% higher");

        // Record previous bid for history
        if (auction.highestBidder != address(0) && auction.highestBid > 0) {
            auctionBids[auctionId].push(Bid({
                bidder: auction.highestBidder,
                amount: auction.highestBid,
                timestamp: block.timestamp,
                isProxy: false
            }));
            
            // Refund previous bidder
            (bool success,) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(success, "Failed to refund previous bidder");
            emit BidRefunded(auctionId, auction.highestBidder, auction.highestBid);
        }

        // Add current bid to history
        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            isProxy: false
        }));

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        // Check if reserve is met
        if (!auction.reserveMet && msg.value >= auction.reservePrice) {
            auction.reserveMet = true;
            emit ReserveMet(auctionId, msg.value);
        }

        uint256 timeRemaining = auction.endTime - block.timestamp;
        bool extended = false;

        if (timeRemaining <= EXTENSION_WINDOW) {
            uint256 oldEndTime = auction.endTime;
            auction.endTime = block.timestamp + EXTENSION_DURATION;
            extended = true;

            emit AuctionExtended(auctionId, oldEndTime, auction.endTime);
        }

        emit BidPlaced(auctionId, msg.sender, msg.value, auction.endTime, extended);
    }

    /**
     * @dev Place a proxy/auto bid
     * @param auctionId The auction to bid on
     * @param maxBid Maximum amount willing to pay
     */
    function placeProxyBid(uint256 auctionId, uint256 maxBid) external payable auctionBiddingOpen(auctionId) {
        require(msg.value > 0, "Must send value");
        
        Auction storage auction = auctions[auctionId];
        ProxyBid storage proxy = proxyBids[auctionId][msg.sender];
        
        proxy.bidder = msg.sender;
        proxy.maxBid = maxBid;
        proxy.active = true;
        
        // Auto-bid logic
        uint256 minBid = auction.highestBid == 0 ? 0 :
            auction.highestBid + (auction.highestBid * MIN_INCREMENT_BPS / 10000);
        
        if (maxBid > minBid) {
            uint256 newBid = minBid;
            if (newBid > maxBid) newBid = maxBid;
            
            proxy.currentBid = newBid;
            
            // Refund previous bidder
            if (auction.highestBidder != address(0) && auction.highestBid > 0) {
                (bool success,) = payable(auction.highestBidder).call{value: auction.highestBid}("");
                require(success, "Failed to refund previous bidder");
                emit BidRefunded(auctionId, auction.highestBidder, auction.highestBid);
            }
            
            // Add proxy bid to history
            auctionBids[auctionId].push(Bid({
                bidder: msg.sender,
                amount: newBid,
                timestamp: block.timestamp,
                isProxy: true
            }));
            
            auction.highestBidder = msg.sender;
            auction.highestBid = newBid;
            
            emit ProxyBidPlaced(auctionId, msg.sender, maxBid, newBid);
        }
        
        // Refund excess
        if (msg.value > proxy.currentBid) {
            (bool success,) = payable(msg.sender).call{value: msg.value - proxy.currentBid}("");
            require(success, "Failed to refund excess");
        }
    }

    /**
     * @dev Update NFT metadata (for custom images)
     * @param tokenId The NFT token ID
     * @param imageURI IPFS CID for the image
     * @param name NFT name
     * @param description NFT description
     */
    function updateNFTMetadata(
        uint256 tokenId,
        string calldata imageURI,
        string calldata name,
        string calldata description
    ) external {
        NFTMetadata storage metadata = nftMetadata[tokenId];
        metadata.imageURI = imageURI;
        metadata.name = name;
        metadata.description = description;
        metadata.isCustom = true;
        metadata.rarityScore = 0; // Can be set by oracle
        
        emit NFTMetadataUpdated(tokenId, imageURI, name, description, true);
    }

    function cancelAuction(uint256 auctionId) external auctionActive(auctionId) {
        Auction storage auction = auctions[auctionId];
        require(auction.seller == msg.sender, "Only seller can cancel");
        require(auction.highestBid == 0, "Cannot cancel with bids");

        // Cancel the cron subscription for auto-finalization
        if (auction.cronSubId != 0) {
            PRECOMPILE.unsubscribe(auction.cronSubId);
        }

        IERC721(auction.nftContract).safeTransferFrom(address(this), msg.sender, auction.tokenId);
        auction.finalized = true;
        _removeFromActiveAuctions(auctionId);
        delete nftAuction[auction.nftContract][auction.tokenId];

        emit AuctionCancelled(auctionId);
        emit NFTTransferred(auctionId, address(this), msg.sender, auction.tokenId);
    }

    function finalizeAuction(uint256 auctionId) external auctionActive(auctionId) {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");

        _finalizeAuction(auctionId);
    }

    function getAuction(uint256 auctionId) external view returns (
        uint256 tokenId,
        address nftContract,
        address seller,
        address highestBidder,
        uint256 highestBid,
        uint256 startTime,
        uint256 endTime,
        bool finalized,
        uint256 bidCount,
        uint256 reservePrice,
        bool reserveMet
    ) {
        Auction storage auction = auctions[auctionId];
        return (
            auction.tokenId,
            auction.nftContract,
            auction.seller,
            auction.highestBidder,
            auction.highestBid,
            auction.startTime,
            auction.endTime,
            auction.finalized,
            auctionBids[auctionId].length,
            auction.reservePrice,
            auction.reserveMet
        );
    }

    function getActiveAuctions() external view returns (uint256[] memory) {
        uint256[] memory temp = activeAuctionIds;
        uint256 count = 0;

        for (uint256 i = 0; i < temp.length; i++) {
            if (isActiveAuction[temp[i]] && !auctions[temp[i]].finalized) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < temp.length; i++) {
            if (isActiveAuction[temp[i]] && !auctions[temp[i]].finalized) {
                result[index] = temp[i];
                index++;
            }
        }

        return result;
    }

    function getBids(uint256 auctionId) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }

    /**
     * @dev Get bid history count
     */
    function getBidHistoryCount(uint256 auctionId) external view returns (uint256) {
        return auctionBids[auctionId].length;
    }

    /**
     * @dev Get unique bidder count for an auction
     */
    function getUniqueBidderCount(uint256 auctionId) external view returns (uint256) {
        Bid[] memory history = auctionBids[auctionId];
        address[] memory uniqueBidders = new address[](history.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < history.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < count; j++) {
                if (uniqueBidders[j] == history[i].bidder) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                uniqueBidders[count] = history[i].bidder;
                count++;
            }
        }
        
        return count;
    }

    /**
     * @dev Get NFT metadata
     */
    function getNFTMetadata(uint256 tokenId) external view returns (
        string memory imageURI,
        string memory name,
        string memory description,
        uint256 rarityScore,
        bool isCustom
    ) {
        NFTMetadata storage metadata = nftMetadata[tokenId];
        return (
            metadata.imageURI,
            metadata.name,
            metadata.description,
            metadata.rarityScore,
            metadata.isCustom
        );
    }

    function getMinimumBid(uint256 auctionId) external view returns (uint256) {
        Auction storage auction = auctions[auctionId];
        if (auction.highestBid == 0) return 0;
        return auction.highestBid + (auction.highestBid * MIN_INCREMENT_BPS / 10000);
    }

    function _finalizeAuction(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];
        bool nftTransferred = false;
        bool paymentSent = false;

        if (auction.highestBidder != address(0) && auction.reserveMet) {
            // Reserve met - transfer NFT to winner and pay seller
            try IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            ) {
                nftTransferred = true;
            } catch {}

            // Automatically send payment to seller
            if (auction.highestBid > 0) {
                (bool success,) = payable(auction.seller).call{value: auction.highestBid}("");
                if (success) {
                    paymentSent = true;
                }
            }

            emit AuctionFinalized(auctionId, auction.highestBidder, auction.highestBid, nftTransferred, paymentSent, true);
            emit NFTTransferred(auctionId, address(this), auction.highestBidder, auction.tokenId);
            emit PaymentSent(auctionId, auction.seller, auction.highestBid);
        } else if (auction.highestBidder != address(0) && !auction.reserveMet) {
            // Bids placed but reserve NOT met - refund bidder, return NFT
            if (auction.highestBid > 0) {
                (bool success,) = payable(auction.highestBidder).call{value: auction.highestBid}("");
                if (success) {
                    paymentSent = true;
                }
            }

            try IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            ) {
                nftTransferred = true;
            } catch {}

            emit AuctionFinalized(auctionId, address(0), auction.highestBid, nftTransferred, false, false);
            emit NFTTransferred(auctionId, address(this), auction.seller, auction.tokenId);
            emit ReserveNotMet(auctionId, auction.highestBid);
        } else {
            // No bids - return NFT to seller
            try IERC721(auction.nftContract).safeTransferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            ) {
                nftTransferred = true;
            } catch {}

            emit AuctionFinalized(auctionId, address(0), 0, nftTransferred, false, false);
            emit NFTTransferred(auctionId, address(this), auction.seller, auction.tokenId);
        }

        auction.finalized = true;
        delete nftAuction[auction.nftContract][auction.tokenId];
        _removeFromActiveAuctions(auctionId);
    }

    function _removeFromActiveAuctions(uint256 auctionId) internal {
        if (!isActiveAuction[auctionId]) return;

        for (uint256 i = 0; i < activeAuctionIds.length; i++) {
            if (activeAuctionIds[i] == auctionId) {
                activeAuctionIds[i] = activeAuctionIds[activeAuctionIds.length - 1];
                activeAuctionIds.pop();
                isActiveAuction[auctionId] = false;
                break;
            }
        }
    }

    /**
     * @dev Internal handler for on-chain reactivity events
     * @param emitter Contract that emitted the event
     * @param eventTopics Event topics (first is event signature)
     * @param data Encoded event data
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) internal override {
        // Only process events from this contract or the Schedule precompile
        if (eventTopics.length == 0) return;

        // Handle Schedule(uint256) event - auto-finalize auction
        if (eventTopics[0] == SCHEDULE_SIG) {
            // Decode the timestamp from the Schedule event data
            // Schedule event: event Schedule(uint256 indexed timestampMillis);
            // The timestamp is in the indexed topic[1], data is empty
            if (eventTopics.length > 1) {
                uint256 timestampMs = uint256(eventTopics[1]);
                uint256 timestampSec = timestampMs / 1000;

                // Find and finalize auctions that ended at this time
                for (uint256 i = 0; i < activeAuctionIds.length; i++) {
                    uint256 auctionId = activeAuctionIds[i];
                    Auction storage auction = auctions[auctionId];

                    // Check if auction endTime matches (within 1 second tolerance)
                    if (!auction.finalized &&
                        auction.endTime <= timestampSec &&
                        auction.endTime + 1 >= timestampSec) {
                        _finalizeAuction(auctionId);
                        emit AuctionAutoFinalized(auctionId);
                    }
                }
            }
        }
        // Handle BidPlaced(uint256,address,uint256,uint256,bool) event - sniper detection
        else if (eventTopics[0] == BID_PLACED_SIG) {
            // Decode bid data to check if it was a sniper bid (extended == true)
            // BidPlaced event topics: [signature, auctionId, bidder]
            // Data: amount, endTime, extended
            if (eventTopics.length >= 3 && data.length == 96) {
                uint256 auctionId = uint256(eventTopics[1]);
                address bidder = address(bytes20(eventTopics[2]));

                // Decode the data portion (amount, endTime, extended)
                (, , bool extended) = abi.decode(data, (uint256, uint256, bool));

                if (extended) {
                    // Sniper detected - last-minute bid that extended the auction
                    emit SniperDetected(auctionId, bidder, block.timestamp);
                }
            }
        }
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {}
}
