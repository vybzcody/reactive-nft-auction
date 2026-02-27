// Deployment Script for Reactive NFT Auction using Viem
// Run with: node scripts/deploy.js

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaTestnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function main() {
  console.log("🚀 Deploying Reactive NFT Auction to Somnia Testnet...\n");

  // Setup clients
  const privateKey = process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SOMNIA_PRIVATE_KEY or PRIVATE_KEY not found in env");
  }

  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(),
  });

  console.log("📍 Network: Somnia Testnet");
  console.log("👤 Deployer:", account.address);
  console.log("");

  // ========== Deploy ReactiveNFT ==========
  console.log("📦 Deploying ReactiveNFT (ERC721)...");
  const nftArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ReactiveNFT.json"), "utf8")
  );

  const nftHash = await walletClient.deployContract({
    abi: nftArtifact.abi,
    bytecode: nftArtifact.bytecode,
    args: ["Reactive NFT Collection", "RNFT"],
  });

  console.log("   Transaction sent:", nftHash);
  const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftHash });
  const nftAddress = nftReceipt.contractAddress;
  console.log("✅ ReactiveNFT deployed to:", nftAddress);
  console.log("");

  // ========== Deploy ReactiveNFTAuction ==========
  console.log("🔨 Deploying ReactiveNFTAuction...");
  const auctionArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ReactiveNFTAuction.json"), "utf8")
  );

  const auctionHash = await walletClient.deployContract({
    abi: auctionArtifact.abi,
    bytecode: auctionArtifact.bytecode,
    args: [],
  });

  console.log("   Transaction sent:", auctionHash);
  const auctionReceipt = await publicClient.waitForTransactionReceipt({ hash: auctionHash });
  const auctionAddress = auctionReceipt.contractAddress;
  console.log("✅ ReactiveNFTAuction deployed to:", auctionAddress);
  console.log("💰 Funded with 32 STT for on-chain reactivity");
  console.log("");

  // ========== Fund Auction Contract for Gas ==========
  console.log("💰 Funding auction contract with 1 STT for gas fees...");
  const fundHash = await walletClient.sendTransaction({
    to: auctionAddress,
    value: parseEther("1"),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log("✅ Funded! Transaction:", fundHash);

  const balance = await publicClient.getBalance({ address: auctionAddress });
  console.log("   Contract balance:", (Number(balance) / 1e18).toFixed(2), "STT");
  console.log("");

  // ========== Save Deployment Info ==========
  const deploymentInfo = {
    network: "somniaTestnet",
    chainId: somniaTestnet.id,
    contracts: {
      ReactiveNFT: {
        address: nftAddress,
        deployedAt: new Date().toISOString(),
        blockNumber: Number(nftReceipt.blockNumber),
      },
      ReactiveNFTAuction: {
        address: auctionAddress,
        deployedAt: new Date().toISOString(),
        blockNumber: Number(auctionReceipt.blockNumber),
        balance: (Number(balance) / 1e18).toFixed(2),
      },
    },
    deployer: account.address,
  };

  const deploymentsPath = path.join(__dirname, "../src/deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to:", deploymentsPath);
  console.log("");

  // ========== Update Contract Config ==========
  console.log("📝 Updating contract config...");
  const configPath = path.join(__dirname, "../src/config/contract.ts");
  const configContent = `// Contract addresses - Updated ${new Date().toISOString()}
export const NFT_CONTRACT_ADDRESS = '${nftAddress}' as const
export const AUCTION_CONTRACT_ADDRESS = '${auctionAddress}' as const

// DiceBear styles for NFT generation
export const DICEBEAR_STYLES = [
  { name: 'Avataaars', value: 0, description: 'Human avatars' },
  { name: 'Bottts', value: 1, description: 'Robots' },
  { name: 'Lorelei', value: 2, description: 'Artistic portraits' },
  { name: 'Notionists', value: 3, description: 'Notion-style illustrations' },
  { name: 'Fun Emoji', value: 4, description: 'Emoji-style' },
  { name: 'Pixel Art', value: 5, description: 'Pixel art style' },
] as const

export const NFT_ABI = ${JSON.stringify(nftArtifact.abi, null, 2)} as const

export const AUCTION_ABI = ${JSON.stringify(auctionArtifact.abi, null, 2)} as const

// Somnia Precompile address
export const SOMNIA_PRECOMPILE = '0x0000000000000000000000000000000000000100' as const
`;

  fs.writeFileSync(configPath, configContent);
  console.log("✅ Contract config updated:", configPath);
  console.log("");

  // ========== Summary ==========
  console.log("=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("   ReactiveNFT:        ", nftAddress);
  console.log("   ReactiveNFTAuction: ", auctionAddress);
  console.log("");
  console.log("💰 Auction Contract Balance: ", (Number(balance) / 1e18).toFixed(2), "STT");
  console.log("");
  console.log("🔗 View on Explorer:");
  console.log("   NFT:        https://shannon-explorer.somnia.network/address/" + nftAddress);
  console.log("   Auction:    https://shannon-explorer.somnia.network/address/" + auctionAddress);
  console.log("");
  console.log("=".repeat(70));
  console.log("🎮 NEXT STEPS:");
  console.log("=".repeat(70));
  console.log("1. Start frontend: npm run dev");
  console.log("2. Connect wallet on Somnia Testnet");
  console.log("3. Mint an NFT (choose style)");
  console.log("4. Approve auction contract for your NFT");
  console.log("5. Create auction (try 60-120 seconds for demo)");
  console.log("6. Place bids and watch sniper protection in action!");
  console.log("=".repeat(70));

  return { nftAddress, auctionAddress };
}

// Execute deployment
main()
  .then(() => {
    console.log("\n✅ Deployment script finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
