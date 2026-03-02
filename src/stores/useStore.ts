import { ref, computed } from 'vue'
import { somniaTestnet } from '../config/chains'

export interface NFT {
  tokenId: bigint
  owner: string
  image: string
  style: number
  styleName: string
  metadata: string
}

export interface Auction {
  id: number
  tokenId: bigint
  nftContract?: string
  seller: string
  highestBidder: string
  highestBid: bigint
  startTime?: bigint
  endTime: bigint
  finalized: boolean
  hasReactiveFinalization?: boolean
  bidCount: bigint
  reservePrice: bigint
  reserveMet: boolean
}

// Centralized singleton state
const accountState = ref<string>()
const chainIdState = ref<number>()
const userNFTsState = ref<NFT[]>([])
const auctionsState = ref<Auction[]>([])
const loadingState = ref(false)
const errorState = ref('')

export function useStore() {
  // Account state
  const account = computed(() => accountState.value)
  const chainId = computed(() => chainIdState.value)
  const isConnected = computed(() => !!accountState.value)
  const isCorrectChain = computed(() => chainIdState.value === somniaTestnet.id)
  
  // NFT state
  const userNFTs = computed(() => userNFTsState.value)
  const setUserNFTs = (nfts: NFT[]) => {
    userNFTsState.value = nfts
  }
  
  // Auction state
  const auctions = computed(() => auctionsState.value)
  const setAuctions = (auctions: Auction[]) => {
    auctionsState.value = auctions
  }
  
  // Loading and error state
  const loading = computed(() => loadingState.value)
  const setLoading = (loading: boolean) => {
    loadingState.value = loading
  }
  const error = computed(() => errorState.value)
  const setError = (error: string) => {
    errorState.value = error
  }
  
  // Set account
  const setAccount = (address: string) => {
    accountState.value = address
  }
  
  // Set chain
  const setChainId = (chainId: number) => {
    chainIdState.value = chainId
  }
  
  // Clear all state (for disconnect)
  const clearState = () => {
    accountState.value = undefined
    chainIdState.value = undefined
    userNFTsState.value = []
    auctionsState.value = []
    errorState.value = ''
  }
  
  return {
    // Account
    account,
    chainId,
    isConnected,
    isCorrectChain,
    setAccount,
    setChainId,
    
    // NFTs
    userNFTs,
    setUserNFTs,
    
    // Auctions
    auctions,
    setAuctions,
    
    // Loading/Error
    loading,
    setLoading,
    error,
    setError,
    
    // Utility
    clearState,
  }
}
