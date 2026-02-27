/**
 * Send STT Script using Viem
 * 
 * Usage: 
 *   node scripts/send-stt.js [recipient] [amount]
 * 
 * Examples:
 *   node scripts/send-stt.js                           # Uses defaults from config
 *   node scripts/send-stt.js 0x8d64...1660D 20         # Send 20 STT
 *   node scripts/send-stt.js 0x1234...5678 5.5         # Send 5.5 STT
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
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

// ============ CONFIGURATION ============
const CONFIG = {
  // Default recipient address (change this)
  RECIPIENT: process.env.RECIPIENT_ADDRESS || '0x8d6443122a9e84a62Bedc3F0d0861C486FA1660D',
  
  // Default amount in STT (change this)
  AMOUNT_STT: process.env.AMOUNT_STT || '20',
  
  // RPC URL for Somnia Dream Testnet
  RPC_URL: 'https://dream-rpc.somnia.network',
  
  // Private key from .env
  PRIVATE_KEY: process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY,
};

// ============ MAIN FUNCTION ============
async function sendSTT() {
  console.log('='.repeat(60));
  console.log('🚀 STT Transfer Script');
  console.log('='.repeat(60));
  console.log();
  
  // Get recipient and amount from command line or use defaults
  const recipient = process.argv[2] || CONFIG.RECIPIENT;
  const amountSTT = process.argv[3] || CONFIG.AMOUNT_STT;
  
  console.log('📋 Transaction Details:');
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Amount:    ${amountSTT} STT`);
  console.log(`   Network:   Somnia Testnet`);
  console.log();
  
  // Validate private key
  if (!CONFIG.PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in .env file');
    console.log('   Please add your private key to .env file:');
    console.log('   PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }
  
  try {
    // Setup account and clients
    const account = privateKeyToAccount(`0x${CONFIG.PRIVATE_KEY.replace('0x', '')}`);
    
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(CONFIG.RPC_URL),
    });
    
    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(CONFIG.RPC_URL),
    });
    
    console.log('👤 Sender Address:', account.address);
    console.log();
    
    // Check sender balance
    const balance = await publicClient.getBalance({ address: account.address });
    const balanceSTT = formatEther(balance);
    console.log('💰 Sender Balance:', `${balanceSTT} STT`);
    
    if (parseFloat(balanceSTT) < parseFloat(amountSTT)) {
      console.error('❌ Error: Insufficient balance');
      console.log(`   Required: ${amountSTT} STT`);
      console.log(`   Available: ${balanceSTT} STT`);
      process.exit(1);
    }
    console.log();
    
    // Send transaction
    console.log('⏳ Sending transaction...');
    const hash = await walletClient.sendTransaction({
      to: recipient,
      value: parseEther(amountSTT),
    });
    
    console.log('📝 Transaction Hash:', hash);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log();
    console.log('✅ Transaction Successful!');
    console.log('='.repeat(60));
    console.log(`   From:      ${account.address}`);
    console.log(`   To:        ${recipient}`);
    console.log(`   Amount:    ${amountSTT} STT`);
    console.log(`   Hash:      ${receipt.transactionHash}`);
    console.log(`   Block:     ${receipt.blockNumber}`);
    console.log(`   Gas Used:  ${receipt.gasUsed.toString()}`);
    console.log(`   Status:    ${receipt.status}`);
    console.log();
    console.log('🔗 View on Explorer:');
    console.log(`   https://somnia-testnet.explorer.caldera.xyz/tx/${receipt.transactionHash}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Transaction Failed:');
    console.error(error.message);
    console.log();
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure you have enough STT for both the transfer and gas fees');
    console.log('   2. Check that your private key is correct in .env');
    console.log('   3. Verify the recipient address is valid');
    process.exit(1);
  }
}

// Run the script
sendSTT();
