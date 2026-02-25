# Reactive NFT Auction

A decentralized NFT auction platform built on Somnia testnet with reactive bidding and sniper protection.

## 🚀 Features

- **NFT Minting** - Mint unique NFTs with DiceBear avatar styles
- **Auction Creation** - Create auctions with customizable duration (1min - 24hrs)
- **Reactive Bidding** - Automatic 2-minute extension when bids are placed in the last 2 minutes
- **Sniper Protection** - Prevents last-second bidding wars
- **Real-time Updates** - Live auction status and countdown timers
- **Wallet Integration** - Connect with MetaMask and other Web3 wallets

## 🛠️ Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Web3**: Viem (Ethereum TypeScript library)
- **Styling**: Tailwind CSS
- **Smart Contracts**: Solidity
- **Network**: Somnia Testnet

## 📦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible Web3 wallet
- Access to Somnia testnet RPC

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your contract addresses
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔗 Links

- **GitHub**: [github.com/vybzcody/reactive-nft-auction](https://github.com/vybzcody/reactive-nft-auction)
- **Issues & Support**: [github.com/vybzcody/reactive-nft-auction/issues](https://github.com/vybzcody/reactive-nft-auction/issues)

## 📝 Contract Addresses

After deploying your contracts, update the addresses in `src/config/contract.ts`:

```typescript
export const NFT_CONTRACT_ADDRESS = '0x...'
export const AUCTION_CONTRACT_ADDRESS = '0x...'
```

## 🎮 How to Use

1. **Connect Wallet** - Click "Connect Wallet" and approve the connection
2. **Switch Network** - Ensure you're on Somnia Testnet
3. **Mint NFT** - Click "Mint NFT" to create your first NFT
4. **Create Auction** - Select your NFT and set auction duration
5. **Place Bids** - Browse auctions and place bids
6. **Withdraw** - Claim your funds after auctions end

## 📄 License

MIT
