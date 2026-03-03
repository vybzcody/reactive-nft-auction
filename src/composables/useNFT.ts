import { formatEther } from 'viem'
import { publicClient, getWalletClient, getGasPrice, estimateGas } from '../config/clients'
import { NFT_CONTRACT_ADDRESS, AUCTION_CONTRACT_ADDRESS, NFT_ABI, AUCTION_ABI, DICEBEAR_STYLES } from '../config/contract'
import { useStore } from '../stores/useStore'
export type { NFT } from '../stores/useStore'
import type { NFT } from '../stores/useStore'

export function useNFT() {
  const store = useStore()

  // Get image URL for a token
  const getImageUrl = (tokenId: number, style: number = 0): string => {
    const styleConfig = DICEBEAR_STYLES[style]
    if (!styleConfig) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${tokenId}&backgroundColor=transparent&size=400`
    
    // Map style names to DiceBear endpoints
    const styleMap: Record<string, string> = {
      'Avataaars': 'avataaars',
      'Bottts': 'bottts', 
      'Lorelei': 'lorelei',
      'Notionists': 'notionists',
      'Fun Emoji': 'fun-emoji',
      'Pixel Art': 'pixel-art',
    }

    const endpoint = styleMap[styleConfig.name] || 'avataaars'
    return `https://api.dicebear.com/7.x/${endpoint}/svg?seed=${tokenId}&backgroundColor=transparent&size=400`
  }

  // Load user's NFTs
  const loadUserNFTs = async (userAddress: string) => {
    try {
      store.setLoading(true)
      store.setError('')

      // Update account state
      store.setAccount(userAddress)

      const walletClient = getWalletClient()
      if (!walletClient) throw new Error('No wallet found')

      // Get total supply
      const totalSupply = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'totalSupply',
      })

      const nfts: NFT[] = []

      // Get all NFTs and filter by owner
      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          const owner = await publicClient.readContract({
            address: NFT_CONTRACT_ADDRESS,
            abi: NFT_ABI,
            functionName: 'ownerOf',
            args: [BigInt(i)],
          })

          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            // Check if NFT has custom metadata in auction contract
            let customMetadata = null
            try {
              const metadata = await publicClient.readContract({
                address: AUCTION_CONTRACT_ADDRESS,
                abi: AUCTION_ABI,
                functionName: 'getNFTMetadata',
                args: [BigInt(i)],
              })
              
              if (metadata[4]) { // isCustom flag
                customMetadata = {
                  imageURI: metadata[0],
                  name: metadata[1],
                  description: metadata[2],
                  isCustom: metadata[4]
                }
              }
            } catch {
              // No custom metadata, use DiceBear
            }

            if (customMetadata) {
              // Use custom metadata
              nfts.push({
                tokenId: BigInt(i),
                owner,
                image: customMetadata.imageURI,
                style: -1, // Custom style indicator
                styleName: 'Custom',
                metadata: customMetadata.name,
              })
            } else {
              // Use DiceBear style based on token ID
              const style = i % 6 // 6 available styles
              nfts.push({
                tokenId: BigInt(i),
                owner,
                image: getImageUrl(i, style),
                style,
                styleName: DICEBEAR_STYLES[style]?.name || 'Avataaars',
                metadata: '',
              })
            }
          }
        } catch {
          // Token might not exist yet
          continue
        }
      }

      store.setUserNFTs(nfts)
      return nfts
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to load NFTs')
      return []
    } finally {
      store.setLoading(false)
    }
  }

  // Mint new NFT
  const mint = async (style: number = 0) => {
    try {
      store.setLoading(true)
      store.setError('')

      const walletClient = getWalletClient()
      if (!walletClient) throw new Error('Wallet not connected')

      const [account] = await walletClient.getAddresses()
      if (!account) throw new Error('No account found')

      // Estimate gas dynamically
      const estimatedGas = await estimateGas({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mintWithStyle',
        args: [style],
        account,
      })

      // Get current gas price
      const gasPrice = await getGasPrice()

      const hash = await walletClient.writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'mintWithStyle',
        args: [style],
        account,
        gas: estimatedGas || 400000n, // Fallback to 400k if estimation fails
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei priority fee
      })

      console.log('[useNFT] Mint transaction sent:', hash)

      // Wait for confirmation with timeout
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 120_000, // 2 minute timeout
      })
      
      console.log('[useNFT] Mint confirmed:', receipt.transactionHash)
      return { hash, receipt }
    } catch (err: any) {
      console.error('[useNFT] Mint failed:', err)
      
      // Handle specific error cases
      if (err.message?.includes('nonce')) {
        store.setError('Transaction nonce conflict. Please try again.')
      } else if (err.message?.includes('underpriced')) {
        store.setError('Transaction was underpriced. Please try again with higher gas.')
      } else if (err.message?.includes('replacement')) {
        store.setError('Transaction was replaced. Please try again.')
      } else {
        store.setError(err.message || 'Failed to mint NFT')
      }
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  // Batch mint NFTs
  const batchMint = async (count: number) => {
    try {
      store.setLoading(true)
      store.setError('')

      const walletClient = getWalletClient()
      if (!walletClient) throw new Error('Wallet not connected')

      const [account] = await walletClient.getAddresses()
      if (!account) throw new Error('No account found')

      // Estimate gas dynamically
      const estimatedGas = await estimateGas({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'batchMint',
        args: [BigInt(count)],
        account,
      })

      // Get current gas price
      const gasPrice = await getGasPrice()

      const hash = await walletClient.writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'batchMint',
        args: [BigInt(count)],
        account,
        gas: estimatedGas || 600000n, // Fallback to 600k if estimation fails
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei priority fee
      })

      console.log('[useNFT] Batch mint transaction sent:', hash)

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 120_000, // 2 minute timeout
      })
      
      console.log('[useNFT] Batch mint confirmed:', receipt.transactionHash)
      return { hash, receipt }
    } catch (err: any) {
      console.error('[useNFT] Batch mint failed:', err)
      
      if (err.message?.includes('nonce')) {
        store.setError('Transaction nonce conflict. Please try again.')
      } else if (err.message?.includes('underpriced')) {
        store.setError('Transaction was underpriced. Please try again.')
      } else if (err.message?.includes('replacement')) {
        store.setError('Transaction was replaced. Please try again.')
      } else {
        store.setError(err.message || 'Failed to batch mint')
      }
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  // Approve auction contract
  const approveForAuction = async (tokenId: number) => {
    const walletClient = getWalletClient()
    if (!walletClient || !store.account.value) throw new Error('Wallet not connected')

    try {
      store.setLoading(true)
      store.setError('')

      // Estimate gas
      const estimatedGas = await estimateGas({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'approve',
        args: [AUCTION_CONTRACT_ADDRESS, BigInt(tokenId)],
        account: store.account.value as `0x${string}`,
      })

      const gasPrice = await getGasPrice()

      const hash = await walletClient.writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'approve',
        args: [AUCTION_CONTRACT_ADDRESS, BigInt(tokenId)],
        account: store.account.value as `0x${string}`,
        gas: estimatedGas || 150000n, // Fallback to 150k
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 1_000_000_000n,
      })

      console.log('[useNFT] Approval transaction sent:', hash)

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 120_000,
      })
      
      console.log('[useNFT] Approval confirmed:', receipt.transactionHash)
      return hash
    } catch (err: any) {
      console.error('[useNFT] Approval failed:', err)
      
      if (err.message?.includes('nonce')) {
        store.setError('Transaction nonce conflict. Please try again.')
      } else if (err.message?.includes('underpriced')) {
        store.setError('Transaction was underpriced. Please try again.')
      } else {
        store.setError(err.message || 'Failed to approve')
      }
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  // Set approval for all
  const setApprovalForAll = async (operator: string, approved: boolean) => {
    const walletClient = getWalletClient()
    if (!walletClient || !store.account.value) throw new Error('Wallet not connected')

    try {
      store.setLoading(true)
      store.setError('')

      const gasPrice = await getGasPrice()

      const hash = await walletClient.writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'setApprovalForAll',
        args: [operator as `0x${string}`, approved],
        account: store.account.value as `0x${string}`,
        gas: 100000n, // setApprovalForAll is typically cheap
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 1_000_000_000n,
      })

      console.log('[useNFT] SetApprovalForAll transaction sent:', hash)

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 120_000,
      })
      
      console.log('[useNFT] SetApprovalForAll confirmed:', receipt.transactionHash)
      return hash
    } catch (err: any) {
      console.error('[useNFT] SetApprovalForAll failed:', err)
      
      if (err.message?.includes('nonce')) {
        store.setError('Transaction nonce conflict. Please try again.')
      } else if (err.message?.includes('underpriced')) {
        store.setError('Transaction was underpriced. Please try again.')
      } else {
        store.setError(err.message || 'Failed to set approval')
      }
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  // Check if approved for auction
  const isApprovedForAuction = async (tokenId: number): Promise<boolean> => {
    try {
      const approved = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'getApproved',
        args: [BigInt(tokenId)],
      })
      return approved.toLowerCase() === AUCTION_CONTRACT_ADDRESS.toLowerCase()
    } catch {
      return false
    }
  }

  // Get NFT info
  const getNFTInfo = async (tokenId: number): Promise<NFT> => {
    const owner = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    })

    // Check if NFT has custom metadata in auction contract
    let customMetadata = null
    try {
      const metadata = await publicClient.readContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'getNFTMetadata',
        args: [BigInt(tokenId)],
      })
      
      if (metadata[4]) { // isCustom flag
        customMetadata = {
          imageURI: metadata[0],
          name: metadata[1],
          description: metadata[2],
          isCustom: metadata[4]
        }
      }
    } catch {
      // No custom metadata, use DiceBear
    }

    if (customMetadata) {
      // Use custom metadata
      return {
        tokenId: BigInt(tokenId),
        owner,
        image: customMetadata.imageURI,
        style: -1, // Custom style indicator
        styleName: 'Custom',
        metadata: customMetadata.name,
      }
    } else {
      // Use DiceBear style based on token ID
      const style = tokenId % 6
      return {
        tokenId: BigInt(tokenId),
        owner,
        image: getImageUrl(tokenId, style),
        style,
        styleName: DICEBEAR_STYLES[style]?.name || 'Avataaars',
        metadata: '',
      }
    }
  }

  return {
    account: store.account,
    chainId: store.chainId,
    isConnected: store.isConnected,
    isCorrectChain: store.isCorrectChain,
    userNFTs: store.userNFTs,
    loading: store.loading,
    error: store.error,
    getImageUrl,
    loadUserNFTs,
    mint,
    batchMint,
    approveForAuction,
    setApprovalForAll,
    isApprovedForAuction,
    getNFTInfo,
    formatEther,
  }
}
