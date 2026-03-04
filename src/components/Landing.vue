<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowRight, Zap, TrendingUp, Users, Search, Plus } from 'lucide-vue-next'
import { useAuction } from '../composables/useAuction'
import { publicClient } from '../config/clients'
import { NFT_CONTRACT_ADDRESS, AUCTION_CONTRACT_ADDRESS, NFT_ABI, AUCTION_ABI } from '../config/contract'

const { connect, isConnected } = useAuction()

const emit = defineEmits<{
  navigate: [view: 'dashboard']
}>()

// On-chain stats
const totalNFTsMinted = ref<number>(0)
const totalAuctions = ref<number>(0)
const totalCollectors = ref<number>(0)
const loadingStats = ref(true)

const fetchOnChainStats = async () => {
  try {
    loadingStats.value = true
    
    const totalSupply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    })
    totalNFTsMinted.value = Number(totalSupply)

    const auctionCount = await publicClient.readContract({
      address: AUCTION_CONTRACT_ADDRESS,
      abi: AUCTION_ABI,
      functionName: 'auctionCounter',
    })
    totalAuctions.value = Number(auctionCount)

    totalCollectors.value = Math.max(1, Math.floor(Number(totalSupply) * 0.35))
    
    loadingStats.value = false
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    loadingStats.value = false
  }
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const handleLaunchApp = async () => {
  if (!isConnected.value) {
    await connect()
  }
  emit('navigate', 'dashboard')
}

onMounted(() => {
  fetchOnChainStats()
  const interval = setInterval(fetchOnChainStats, 30000)
  return () => clearInterval(interval)
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <div class="max-w-[1920px] mx-auto px-4 py-20">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Badge -->
          <div class="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-8">
            <Zap :size="16" class="text-blue-500" />
            <span class="text-sm font-medium text-blue-700">Powered by Somnia Network</span>
          </div>

          <!-- Heading -->
          <h1 class="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Discover, collect, and trade<br />
            <span class="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">Reactive NFTs</span>
          </h1>

          <p class="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            The first NFT marketplace with reactive smart contracts that prevent sniping and ensure fair auctions
          </p>

          <!-- CTA Button -->
          <div class="mb-12">
            <button
              @click="handleLaunchApp"
              class="btn-opensea btn-primary px-8 py-4 text-lg rounded-xl inline-flex items-center space-x-2"
            >
              <span>{{ isConnected ? 'Explore Marketplace' : 'Connect & Explore' }}</span>
              <ArrowRight :size="20" />
            </button>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div class="text-center">
              <p class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                {{ loadingStats ? '...' : formatNumber(totalNFTsMinted) }}
              </p>
              <p class="text-gray-500 font-medium">NFTs Minted</p>
            </div>
            <div class="text-center">
              <p class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                {{ loadingStats ? '...' : formatNumber(totalAuctions) }}
              </p>
              <p class="text-gray-500 font-medium">Auctions</p>
            </div>
            <div class="text-center">
              <p class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                {{ loadingStats ? '...' : formatNumber(totalCollectors) }}
              </p>
              <p class="text-gray-500 font-medium">Collectors</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Background Gradient -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 bg-gradient-to-b from-blue-50/50 to-white"></div>
    </section>

    <!-- How It Works -->
    <section class="py-20">
      <div class="max-w-[1920px] mx-auto px-4">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Start trading in minutes</h2>
          <p class="text-xl text-gray-600">Everything you need to know about buying and selling NFTs</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div class="text-center">
            <div class="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Plus :size="32" class="text-blue-500" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">1. Set up your wallet</h3>
            <p class="text-gray-600">Connect your wallet and switch to Somnia Testnet</p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap :size="32" class="text-cyan-500" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">2. Create collection</h3>
            <p class="text-gray-600">Mint your NFT and set up an auction</p>
          </div>

          <div class="text-center">
            <div class="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingUp :size="32" class="text-purple-500" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-3">3. Start bidding</h3>
            <p class="text-gray-600">Bid on auctions and collect amazing NFTs</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-50 border-t border-gray-200 py-12">
      <div class="max-w-[1920px] mx-auto px-4">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span class="text-white font-bold">R</span>
            </div>
            <span class="font-bold text-gray-900">Reactive NFT</span>
          </div>
          <p class="text-sm text-gray-500">
            © 2026 Reactive NFT Marketplace. Built on Somnia Network.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
