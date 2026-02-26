# Reactive NFT Auction Contracts

Smart contracts for the Reactive NFT Auction platform on Somnia Network, featuring sniper protection through reactive smart contracts.

## 📁 Contracts

### 1. ReactiveNFT.sol
ERC721 NFT contract with **DiceBear API** integration for deterministic image generation.

**Key Features:**
- ✅ No image storage needed - images generated on-the-fly
- ✅ Deterministic: same token ID = same image
- ✅ 6 different art styles available
- ✅ Enumerable extension for marketplace discovery

**DiceBear Styles:**
| Style | Value | Description |
|-------|-------|-------------|
| Avataaars | 0 | Human avatars |
| Bottts | 1 | Robots |
| Lorelei | 2 | Artistic portraits |
| Notionists | 3 | Notion-style illustrations |
| Fun Emoji | 4 | Emoji-style |
| Pixel Art | 5 | Pixel art style |

**Example Image URL:**
```
https://api.dicebear.com/7.x/avataaars/svg?seed=123&backgroundColor=transparent&size=400
```

### 2. ReactiveNFTAuction.sol
NFT auction contract with **Somnia Reactivity** for automatic finalization and sniper protection.

**Key Features:**
- ✅ Real ERC721 NFT integration (NFTs locked in contract)
- ✅ Reactive smart contracts via Somnia Precompile
- ✅ Automatic auction finalization (no keepers!)
- ✅ Sniper protection: 2-minute extension window
- ✅ 10% minimum bid increment
- ✅ Automatic refunds for outbid bidders

**Sniper Protection Mechanism:**
```solidity
// When bid placed in last 2 minutes:
if (timeRemaining <= EXTENSION_WINDOW) {
    auction.endTime = block.timestamp + EXTENSION_DURATION; // +2 minutes
    _updateFinalizationSubscription(auctionId, auction.endTime);
}
```

**Somnia Reactivity Flow:**
1. Create auction → Subscribe to Schedule event at end time
2. Bid placed in extension window → Extend time + update subscription
3. Time expires → Somnia validators call `_onEvent()` → Finalize auction
4. NFT automatically transferred to winner

## 🚀 Deployment

### Prerequisites
```bash
npm install
```

### Environment Variables
```bash
# Somnia RPC
SOMNIA_RPC_URL=https://somnia-testnet.rpc.caldera.xyz/http

# Private key (for deployment)
PRIVATE_KEY=your_private_key_here

# IPFS (optional, not needed with DiceBear)
IPFS_API_URL=https://api.storacha.network
IPFS_API_KEY=your_key
```

### Deploy Contracts
```bash
npx hardhat run scripts/deploy.ts --network somnia
```

This will:
1. Deploy ReactiveNFT contract
2. Deploy ReactiveNFTAuction contract
3. Save addresses to `src/config/contract.ts`

## 📝 Usage

### 1. Mint NFT
```typescript
// Mint with default style (Avataaars)
await nftContract.mint()

// Mint with specific style
await nftContract.mintWithStyle(1) // Bottts (robots)

// Batch mint (up to 10)
await nftContract.batchMint(5)
```

### 2. Create Auction
```typescript
// First, approve auction contract to transfer your NFT
await nftContract.approve(AUCTION_CONTRACT_ADDRESS, tokenId)

// Create auction (duration: 1 hour = 3600 seconds)
await auctionContract.createAuction(
  NFT_CONTRACT_ADDRESS,
  tokenId,
  3600
)
```

### 3. Place Bid
```typescript
// Get minimum bid (current bid + 10%)
const minBid = await auctionContract.getMinimumBid(auctionId)

// Place bid (must send value >= minBid)
await auctionContract.placeBid(auctionId, { value: minBid })
```

### 4. Withdraw Funds
```typescript
// For sellers: withdraw winning bid
await auctionContract.withdraw()

// For outbid bidders: automatic refund tracking
const withdrawable = await auctionContract.getUserWithdrawal(userAddress)
await auctionContract.withdraw()
```

## 🎯 Contract Addresses (Testnet)

Update after deployment:

```typescript
// src/config/contract.ts
export const NFT_CONTRACT_ADDRESS = '0x...'
export const AUCTION_CONTRACT_ADDRESS = '0x...'
```

## 📊 Architecture

```
┌─────────────────┐         ┌──────────────────────┐
│   ReactiveNFT   │────────▶│ ReactiveNFTAuction   │
│   (ERC721)      │         │   (Auction Logic)    │
└─────────────────┘         └──────────┬───────────┘
                                       │
                                       │ Reactive
                                       │ Subscription
                                       ▼
                              ┌──────────────────────┐
                              │  Somnia Precompile   │
                              │  (Schedule Event)    │
                              └──────────┬───────────┘
                                         │
                                         │ Auto-calls
                                         ▼
                              ┌──────────────────────┐
                              │   _onEvent() Handler │
                              │   (Finalize Auction) │
                              └──────────────────────┘
```

## 🔧 Key Constants

```solidity
// Auction settings
EXTENSION_WINDOW = 120 seconds      // 2-minute sniper protection window
EXTENSION_DURATION = 120 seconds    // Extend by 2 minutes
MIN_INCREMENT_BPS = 1000            // 10% minimum bid increase
MIN_DURATION = 60 seconds           // Minimum auction length
MAX_DURATION = 86400 seconds        // Maximum auction length (24h)

// Somnia Precompile
PRECOMPILE = 0x0000000000000000000000000000000000000070
SCHEDULE_SELECTOR = 0x67aa3d752967d87d8944b9c7adf73172518777fa4703f336edee81f0736d8987
```

## 🛡️ Security Notes

1. **NFT Approval**: Users must approve auction contract before creating auction
2. **Automatic Refunds**: Outbid bidders accumulate withdrawable balance
3. **Reentrancy Protection**: Balance reset before transfer
4. **Gas Limits**: 2M gas per reactive finalization (sufficient for NFT transfer)

## 📚 Resources

- [Somnia Documentation](https://docs.somnia.network)
- [DiceBear API](https://www.dicebear.com/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🎨 DiceBear Image Examples

| Token ID | Avataaars | Bottts | Pixel Art |
|----------|-----------|--------|-----------|
| 1 | [View](https://api.dicebear.com/7.x/avataaars/svg?seed=1) | [View](https://api.dicebear.com/7.x/bottts/svg?seed=1) | [View](https://api.dicebear.com/7.x/pixel-art/svg?seed=1) |
| 2 | [View](https://api.dicebear.com/7.x/avataaars/svg?seed=2) | [View](https://api.dicebear.com/7.x/bottts/svg?seed=2) | [View](https://api.dicebear.com/7.x/pixel-art/svg?seed=2) |
| 3 | [View](https://api.dicebear.com/7.x/avataaars/svg?seed=3) | [View](https://api.dicebear.com/7.x/bottts/svg?seed=3) | [View](https://api.dicebear.com/7.x/pixel-art/svg?seed=3) |

---

**Built for Somnia Network Hackathon** 🏆
