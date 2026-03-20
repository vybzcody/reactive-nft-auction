import { ref } from 'vue'
import { publicClient, getWalletClient, getGasPrice, estimateGas } from '../config/clients'
import { AUCTION_CONTRACT_ADDRESS, AUCTION_ABI } from '../config/contract'
import { storacha } from '../services/storacha'
import { useStore } from '../stores/useStore'

export function useCustomNFT() {
  const store = useStore()
  const uploading = ref(false)
  const uploadProgress = ref(0)

  /**
   * Upload custom image and create metadata
   */
  const uploadCustomImage = async (file: File, name?: string, description?: string) => {
    try {
      uploading.value = true
      uploadProgress.value = 0

      // Upload image to IPFS
      const imageCid = await storacha.upload(file, (progress) => {
        uploadProgress.value = Math.floor(progress * 0.8) // 80% for image upload
      })

      const imageURI = storacha.getGatewayUrl(imageCid)
      
      // Create metadata object
      const metadata = {
        name: name || `Custom NFT`,
        description: description || 'A custom NFT uploaded to IPFS',
        image: imageURI,
        attributes: [
          {
            trait_type: 'Type',
            value: 'Custom Upload'
          },
          {
            trait_type: 'File Type',
            value: file.type
          },
          {
            trait_type: 'File Size',
            value: `${(file.size / 1024 / 1024).toFixed(2)} MB`
          }
        ]
      }

      // Upload metadata to IPFS
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json'
      })
      const metadataFile = new File([metadataBlob], 'metadata.json', {
        type: 'application/json'
      })

      const metadataCid = await storacha.upload(metadataFile, (progress) => {
        uploadProgress.value = 80 + Math.floor(progress * 0.2) // Remaining 20%
      })

      uploadProgress.value = 100

      return {
        imageURI,
        metadataURI: storacha.getGatewayUrl(metadataCid),
        imageCid,
        metadataCid
      }
    } catch (error) {
      console.error('Failed to upload custom NFT:', error)
      throw error
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * Update NFT metadata via auction contract
   */
  const updateNFTMetadata = async (
    tokenId: number,
    imageURI: string,
    name: string,
    description: string
  ) => {
    try {
      store.setLoading(true)
      store.setError('')

      const walletClient = getWalletClient()
      if (!walletClient) throw new Error('Wallet not connected')

      const [account] = await walletClient.getAddresses()
      if (!account) throw new Error('No account found')

      // Estimate gas
      const estimatedGas = await estimateGas({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'updateNFTMetadata',
        args: [BigInt(tokenId), imageURI, name, description],
        account,
      })

      const gasPrice = await getGasPrice()

      const hash = await walletClient.writeContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'updateNFTMetadata',
        args: [BigInt(tokenId), imageURI, name, description],
        account,
        gas: estimatedGas || 200000n,
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: 1_000_000_000n,
      })

      console.log('[useCustomNFT] Metadata update transaction sent:', hash)

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 120_000,
      })
      
      console.log('[useCustomNFT] Metadata update confirmed:', receipt.transactionHash)
      return { hash, receipt }
    } catch (err: any) {
      console.error('[useCustomNFT] Metadata update failed:', err)
      store.setError(err.message || 'Failed to update NFT metadata')
      throw err
    } finally {
      store.setLoading(false)
    }
  }

  /**
   * Get NFT metadata from auction contract
   */
  const getNFTMetadata = async (tokenId: number) => {
    try {
      const metadata = await publicClient.readContract({
        address: AUCTION_CONTRACT_ADDRESS,
        abi: AUCTION_ABI,
        functionName: 'getNFTMetadata',
        args: [BigInt(tokenId)],
      })

      return {
        imageURI: metadata[0],
        name: metadata[1],
        description: metadata[2],
        rarityScore: Number(metadata[3]),
        isCustom: metadata[4]
      }
    } catch (error) {
      console.error('Failed to get NFT metadata:', error)
      return null
    }
  }

  return {
    uploading,
    uploadProgress,
    uploadCustomImage,
    updateNFTMetadata,
    getNFTMetadata,
    loading: store.loading,
    error: store.error,
  }
}
