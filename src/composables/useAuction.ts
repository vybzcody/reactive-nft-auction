import { parseEther, formatEther } from 'viem'
import { publicClient, getWalletClient, getGasPrice, estimateGas } from '../config/clients'
import { AUCTION_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS, AUCTION_ABI } from '../config/contract'
import { somniaTestnet } from '../config/chains'
import { useStore } from '../stores/useStore'
export type { Auction } from '../stores/useStore'
import type { Auction } from '../stores/useStore'

export function useAuction() {
  const store = useStore()
  const isConnected = store.isConnected
  const isCorrectChain = store.isCorrectChain
  const loading = store.loading
  const error = store.error
  
  // Connect wallet
  const connect = async () => {
    const walletClient = getWalletClient()
    if (!walletClient) throw new Error('No wallet found')

    // Request account access - this triggers the wallet selection modal
    const addresses = await walletClient.requestAddresses()
    if (!addresses || addresses.length === 0) {
      throw new Error('No accounts found')
    }
    
    const address = addresses[0]
    store.setAccount(address)

    // Get current chain
    const chainId = await walletClient.getChainId()
    store.setChainId(chainId)

    return address
  }

  // Switch to Somnia testnet
  const switchChain = async () => {
    const walletClient = getWalletClient()
    if (!walletClient) throw new Error('No wallet found')

    try {
      await walletClient.switchChain({ id: somniaTestnet.id })
      store.setChainId(somniaTestnet.id)
    } catch (error) {
      // If chain doesn't exist, add it
      await walletClient.addChain({ chain: somniaTestnet })
      store.setChainId(somniaTestnet.id)
    }
  }

  // Read auction data
  const getAuction = async (auctionId: number): Promise<Auction> => {
    const result = await publicClient.readContract({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      functionName: 'getAuction',
      args: [BigInt(auctionId)],
    })

    // Contract returns: tokenId, nftContract, seller, highestBidder, highestBid, startTime, endTime, finalized, bidCount, reservePrice, reserveMet
    return {
      id: auctionId,
      tokenId: result[0] as unknown as bigint,
      nftContract: result[1] as unknown as string,
      seller: result[2] as unknown as string,
      highestBidder: result[3] as unknown as string,
      highestBid: result[4] as unknown as bigint,
      startTime: result[5] as unknown as bigint,
      endTime: result[6] as unknown as bigint,
      finalized: result[7] as unknown as boolean,
      bidCount: result[8] as unknown as bigint,
      reservePrice: result[9] as unknown as bigint,
      reserveMet: result[10] as unknown as boolean,
    }
  }

  // Get active auctions
  const getActiveAuctions = async (): Promise<number[]> => {
    const result = await publicClient.readContract({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      functionName: 'getActiveAuctions',
    })
    return result.map(id => Number(id))
  }

  // Create auction
  const createAuction = async (tokenId: number, durationSeconds: number, reservePrice: bigint) => {
    const walletClient = getWalletClient()
    if (!walletClient || !store.account.value) throw new Error('Wallet not connected')

    console.log('[useAuction] Creating auction:', {
      tokenId,
      durationSeconds,
      durationMinutes: durationSeconds / 60,
      reservePrice: reservePrice.toString(),
      account: store.account.value,
      contract: AUCTION_CONTRACT_ADDRESS,
      nftContract: NFT_CONTRACT_ADDRESS,
    })

    // Get current gas price first
    const gasPrice = await getGasPrice()

    // Estimate gas (with fallback for Somnia testnet)
    let estimatedGas: bigint | undefined
    try {
      estimatedGas = await estimateGas({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'createAuction',
        args: [NFT_CONTRACT_ADDRESS, BigInt(tokenId), BigInt(durationSeconds), reservePrice] as const,
        account: store.account.value as `0x${string}`,
      })
      if (estimatedGas) {
        console.log('[useAuction] Gas estimated:', estimatedGas.toString())
      }
    } catch (estError) {
      console.warn('[useAuction] Gas estimation failed, using wallet default:', estError)
    }

    try {
      const hash = await walletClient.writeContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'createAuction',
        args: [NFT_CONTRACT_ADDRESS, BigInt(tokenId), BigInt(durationSeconds), reservePrice] as const,
        account: store.account.value as `0x${string}`,
        gas: estimatedGas, // undefined lets wallet use its own estimation
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 3_000_000_000n, // 3 gwei priority fee (higher for Somnia)
      })
      console.log('[useAuction] Transaction hash:', hash)

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 120_000,
      })

      console.log('[useAuction] Auction created:', receipt.transactionHash)
      return { hash, receipt }
    } catch (error: any) {
      console.error('[useAuction] Create auction failed:', error)

      // Check for specific error messages from contract
      if (error.message?.includes('Duration too short')) {
        throw new Error('Duration must be at least 60 seconds (1 minute)')
      } else if (error.message?.includes('Duration too long')) {
        throw new Error('Duration must be at most 86400 seconds (24 hours)')
      } else if (error.message?.includes('Not NFT owner')) {
        throw new Error('You do not own this NFT')
      } else if (error.message?.includes('Contract not approved')) {
        throw new Error('Auction contract is not approved to transfer your NFT. Please approve first.')
      } else if (error.message?.includes('nonce')) {
        throw new Error('Transaction nonce conflict. Please try again.')
      } else if (error.message?.includes('underpriced')) {
        throw new Error('Transaction was underpriced. Please try again.')
      } else if (error.message?.includes('replacement')) {
        throw new Error('Transaction was replaced. Please try again.')
      } else if (error.message?.includes('execution reverted')) {
        throw new Error('Transaction failed. Possible reasons:\n1. Auction contract needs 32 SOMI balance for subscriptions\n2. NFT approval issue\n3. Invalid duration (must be 60s - 24hrs)')
      }
      throw error
    }
  }

  // Place bid
  const placeBid = async (auctionId: number, bidAmount: string | number) => {
    const walletClient = getWalletClient()
    if (!walletClient || !store.account.value) throw new Error('Wallet not connected')

    // Ensure bidAmount is a string
    const amountStr = String(bidAmount)
    const bidValue = parseEther(amountStr)

    console.log('[useAuction] Placing bid:', {
      auctionId,
      bidAmount: amountStr,
      bidValue: bidValue.toString(),
      account: store.account.value,
    })

    // Get current gas price
    const gasPrice = await getGasPrice()

    // Try to estimate gas for bid
    let estimatedGas: bigint | undefined
    try {
      estimatedGas = await estimateGas({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'placeBid',
        args: [BigInt(auctionId)],
        account: store.account.value as `0x${string}`,
        value: bidValue,
      })
      if (estimatedGas) {
        console.log('[useAuction] Bid gas estimated:', estimatedGas.toString())
      }
    } catch (estError) {
      console.warn('[useAuction] Bid gas estimation failed, using wallet default:', estError)
    }

    try {
      const hash = await walletClient.writeContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'placeBid',
        args: [BigInt(auctionId)],
        value: bidValue,
        account: store.account.value as `0x${string}`,
        gas: estimatedGas, // undefined lets wallet use its own estimation
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 1_000_000_000n,
      })
      
      console.log('[useAuction] Bid transaction hash:', hash)
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 120_000,
      })
      
      console.log('[useAuction] Bid confirmed:', receipt.transactionHash)
      return { hash, receipt }
    } catch (error: any) {
      console.error('[useAuction] Place bid failed:', error)

      // Check for common errors and throw user-friendly messages
      if (error.message?.includes('Bid must be higher')) {
        throw new Error('Bid must be higher than current highest bid (at least 10% more)')
      }
      if (error.message?.includes('Auction already ended')) {
        throw new Error('This auction has already ended')
      }
      if (error.message?.includes('reverted') || error.message?.includes('Internal')) {
        throw new Error('Bid failed. Make sure you have enough STT balance and the auction is still active.')
      }
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient STT balance for this bid')
      }
      if (error.message?.includes('nonce')) {
        throw new Error('Transaction nonce conflict. Please try again.')
      }
      if (error.message?.includes('underpriced')) {
        throw new Error('Transaction was underpriced. Please try again.')
      }
      if (error.message?.includes('replacement')) {
        throw new Error('Transaction was replaced. Please try again.')
      }
      throw error
    }
  }

  return {
    account: store.account,
    chainId: store.chainId,
    isConnected,
    isCorrectChain,
    loading,
    error,
    connect,
    switchChain,
    getAuction,
    getActiveAuctions,
    createAuction,
    placeBid,
    formatEther,
  }
}
