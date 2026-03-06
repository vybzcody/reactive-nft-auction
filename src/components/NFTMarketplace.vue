<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Clock, TrendingUp, Award, Search, Filter } from 'lucide-vue-next'
import { useAuction, type Auction } from '../composables/useAuction'
import { useNFT } from '../composables/useNFT'

type FilterType = 'all' | 'ongoing' | 'completed' | 'extended'

interface NFTCard extends Auction {
  image: string
  rating: string
}

const emit = defineEmits<{
  select: [nft: NFTCard]
  back: []
}>()

const { getActiveAuctions, getAuction, formatEther } = useAuction()
const { getImageUrl } = useNFT()

const nfts = ref<NFTCard[]>([])
const loading = ref(false)
const activeFilter = ref<FilterType>('all')

const fetchAuctions = async () => {
  try {
    loading.value = true
    const activeIds = await getActiveAuctions()
    const auctionData = await Promise.all(activeIds.map(id => getAuction(id)))
    nfts.value = auctionData.map(auction => ({
      ...auction,
      image: getImageUrl(Number(auction.tokenId)),
      rating: (Math.random() * 2 + 3).toFixed(1),
    }))
  } catch (err) {
    console.error('Failed to load auctions:', err)
  } finally {
    loading.value = false
  }
}

const filteredAuctions = computed(() => {
  const now = Date.now()
  return nfts.value.filter(auction => {
    const isEnded = auction.finalized || now >= Number(auction.endTime) * 1000
    switch (activeFilter.value) {
      case 'ongoing': return !isEnded
      case 'completed': return isEnded
      case 'extended': return auction.bidCount > 0n && !isEnded
      default: return true
    }
  })
})

const isAuctionActive = (auction: Auction) => !auction.finalized && Date.now() < Number(auction.endTime) * 1000

const getTimeLeft = (endTime: bigint) => {
  const diff = Number(endTime) * 1000 - Date.now()
  if (diff <= 0) return 'Ended'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h ${minutes}m`
}

const handleSelectNFT = (nft: NFTCard) => {
  emit('select', nft)
}

onMounted(() => fetchAuctions())
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div class="max-w-[1920px] mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <button
            @click="$emit('back')"
            class="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors"
          >
            <ArrowLeft :size="20" />
            <span class="font-medium">Back</span>
          </button>
          <h1 class="text-2xl font-bold text-gray-900">NFT Marketplace</h1>
          <button
            @click="fetchAuctions"
            class="flex items-center space-x-2 text-gray-600 hover:text-blue-500"
          >
            <span>{{ loading ? 'Loading...' : 'Refresh' }}</span>
          </button>
        </div>
      </div>
    </div>

    <main class="max-w-[1920px] mx-auto px-4 py-8">
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-3 mb-8">
        <button
          v-for="filter in ['all', 'ongoing', 'completed', 'extended']"
          :key="filter"
          @click="activeFilter = filter as FilterType"
          class="px-4 py-2 rounded-xl text-sm font-medium transition-all border-2"
          :class="activeFilter === filter
            ? 'border-blue-500 text-blue-500 bg-blue-50'
            : 'border-gray-200 text-gray-600 hover:border-gray-300'"
        >
          {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
        </button>
      </div>

      <!-- Grid -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <div v-else-if="filteredAuctions.length === 0" class="text-center py-20">
        <p class="text-gray-500 text-lg">No auctions found</p>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div
          v-for="nft in filteredAuctions"
          :key="nft.id"
          @click="handleSelectNFT(nft)"
          class="card-nft cursor-pointer group"
        >
          <div class="relative aspect-square overflow-hidden bg-gray-100">
            <img :src="nft.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <span
              class="absolute top-3 left-3 badge-status"
              :class="isAuctionActive(nft) ? 'badge-live' : 'badge-ending'"
            >
              {{ isAuctionActive(nft) ? 'Live' : 'Ended' }}
            </span>
          </div>
          <div class="p-4 space-y-3">
            <h3 class="font-semibold text-gray-900 group-hover:text-blue-500">NFT #{{ nft.tokenId }}</h3>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-gray-500">Current Bid</p>
                <p class="text-lg font-bold text-blue-500">{{ formatEther(nft.highestBid) }} STT</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">Ends in</p>
                <p class="text-sm font-medium">{{ getTimeLeft(nft.endTime) }}</p>
              </div>
            </div>
            <div class="pt-3 border-t border-gray-100 text-xs text-gray-500">
              {{ nft.bidCount.toString() }} bids
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
