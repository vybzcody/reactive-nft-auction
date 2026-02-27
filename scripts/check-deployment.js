// Check deployment status
// Run with: node scripts/check-deployment.js

import { createPublicClient, http } from "viem";
import { somniaTestnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🔍 Checking deployment status...\n");

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(),
  });

  // Check if config exists
  const configPath = path.join(__dirname, "../src/config/contract.ts");
  if (!fs.existsSync(configPath)) {
    console.log("❌ No deployment found. Run: npm run deploy");
    process.exit(1);
  }

  // Extract addresses from config (simple regex)
  const configContent = fs.readFileSync(configPath, "utf8");
  const nftMatch = configContent.match(/NFT_CONTRACT_ADDRESS = '([^']+)'/);
  const auctionMatch = configContent.match(/AUCTION_CONTRACT_ADDRESS = '([^']+)'/);

  if (!nftMatch || !auctionMatch) {
    console.log("❌ Contract addresses not found in config. Run: npm run deploy");
    process.exit(1);
  }

  const nftAddress = nftMatch[1];
  const auctionAddress = auctionMatch[1];

  console.log("📋 Contract Addresses:");
  console.log("   NFT:       ", nftAddress);
  console.log("   Auction:   ", auctionAddress);
  console.log("");

  // Check if contracts exist
  console.log("🔍 Checking contracts on-chain...");

  try {
    const nftCode = await publicClient.getBytecode({ address: nftAddress });
    if (nftCode && nftCode !== '0x') {
      console.log("✅ NFT contract is deployed");
    } else {
      console.log("❌ NFT contract not found on-chain");
    }
  } catch (error) {
    console.log("❌ Error checking NFT contract:", error.message);
  }

  try {
    const auctionCode = await publicClient.getBytecode({ address: auctionAddress });
    if (auctionCode && auctionCode !== '0x') {
      console.log("✅ Auction contract is deployed");
    } else {
      console.log("❌ Auction contract not found on-chain");
    }
  } catch (error) {
    console.log("❌ Error checking auction contract:", error.message);
  }

  // Check auction contract balance
  try {
    const balance = await publicClient.getBalance({ address: auctionAddress });
    const balanceEth = Number(balance) / 1e18;
    
    if (balanceEth >= 32) {
      console.log(`✅ Auction contract funded: ${balanceEth.toFixed(2)} STT`);
    } else if (balanceEth > 0) {
      console.log(`⚠️  Auction contract underfunded: ${balanceEth.toFixed(2)} STT (need 32+)`);
    } else {
      console.log(`❌ Auction contract not funded: ${balanceEth.toFixed(2)} STT`);
    }
  } catch (error) {
    console.log("❌ Error checking balance:", error.message);
  }

  console.log("");
  console.log("🔗 Explorer Links:");
  console.log("   NFT:       https://somnia-testnet.explorer.caldera.xyz/address/" + nftAddress);
  console.log("   Auction:   https://somnia-testnet.explorer.caldera.xyz/address/" + auctionAddress);
  console.log("");

  console.log("=".repeat(60));
  console.log("✅ Deployment check complete!");
  console.log("=".repeat(60));
  console.log("");
  console.log("Next steps:");
  console.log("1. npm run dev");
  console.log("2. Connect wallet on Somnia Testnet");
  console.log("3. Mint an NFT and create an auction!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
