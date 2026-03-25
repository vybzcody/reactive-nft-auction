<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Clock, TrendingUp, Heart, MoreHorizontal, Zap } from 'lucide-vue-next'
import { useAuction, type Auction } from '../composables/useAuction'
import { useNFT } from '../composables/useNFT'

interface NFTCard extends Auction {
  image: string
  liked: boolean
}

const { getActiveAuctions, getAuction, formatEther } = useAuction()
const { getImageUrl } = useNFT()

const nfts = ref<NFTCard[]>([])
const loading = ref(true)

const emit = defineEmits<{
  select: [nft: NFTCard]
}>()

const fetchAuctions = async () => {
  try {
    loading.value = true
    console.log('📡 Fetching auctions...')
    const activeIds = await getActiveAuctions()
    console.log('📦 Active auction IDs:', activeIds)
    
    if (activeIds.length === 0) {
      nfts.value = []
      return
    }
    
    const auctionData = await Promise.all(activeIds.map(id => getAuction(id)))
    console.log('✅ Loaded', auctionData.length, 'auctions')

    nfts.value = auctionData.map((auction) => ({
      ...auction,
      image: getImageUrl(Number(auction.tokenId)),
      liked: false,
    }))
  } catch (err) {
    console.error('Failed to load auctions:', err)
  } finally {
    loading.value = false
  }
}

const isAuctionActive = (auction: Auction) => {
  return !auction.finalized && Date.now() < Number(auction.endTime) * 1000
}

const getTimeLeft = (endTime: bigint) => {
  const now = Date.now()
  const end = Number(endTime) * 1000
  const diff = end - now

  if (diff <= 0) return 'Ended'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

const handleSelectNFT = (nft: NFTCard) => {
  emit('select', nft)
}

onMounted(() => {
  fetchAuctions()
  // Refresh every 30 seconds
  const interval = setInterval(fetchAuctions, 30000)
  return () => clearInterval(interval)
})
</script>

<template>
  <main class="flex-1 p-6 bg-white">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">NFT Auctions</h1>
        <p class="text-gray-500">Discover and bid on reactive NFTs</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="nfts.length === 0" class="text-center py-20">
      <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Zap :size="48" class="text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">No auctions found</h3>
      <p class="text-gray-500 mb-6">Create your first auction to get started</p>
    </div>

    <!-- NFT Grid -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div
        v-for="nft in nfts"
        :key="nft.id"
        @click="handleSelectNFT(nft)"
        class="card-nft group cursor-pointer"
      >
        <!-- Image -->
        <div class="relative aspect-square overflow-hidden bg-gray-100">
          <img
            :src="nft.image"
            :alt="`NFT #${nft.tokenId}`"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          <!-- Status Badge -->
          <div class="absolute top-3 left-3">
            <span
              v-if="isAuctionActive(nft)"
              class="badge-status badge-live"
            >
              Live
            </span>
            <span
              v-else
              class="badge-status badge-ending"
            >
              Ended
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-3">
          <!-- Title -->
          <div>
            <h3 class="font-semibold text-gray-900 group-hover:text-blue-500 transition-colors">
              NFT #{{ nft.tokenId.toString() }}
            </h3>
            <p class="text-sm text-gray-500">Seller: {{ nft.seller.slice(0, 4) }}...{{ nft.seller.slice(-4) }}</p>
          </div>

          <!-- Price Info -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-500 mb-1">
                {{ isAuctionActive(nft) ? 'Current Bid' : 'Final Bid' }}
              </p>
              <p class="text-lg font-bold text-blue-500">
                {{ formatEther(nft.highestBid) }} STT
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-500 mb-1 flex items-center justify-end space-x-1">
                <Clock :size="12" />
                <span>Ends in</span>
              </p>
              <p class="text-sm font-medium text-gray-900">
                {{ getTimeLeft(nft.endTime) }}
              </p>
            </div>
          </div>

          <!-- Bid Count -->
          <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span class="flex items-center space-x-1">
              <TrendingUp :size="12" />
              <span>{{ nft.bidCount.toString() }} bids</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
