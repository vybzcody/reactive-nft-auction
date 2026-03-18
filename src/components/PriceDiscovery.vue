<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TrendingUp, DollarSign, Users, Eye, Zap, AlertCircle } from 'lucide-vue-next'
import { priceDiscovery, type PriceStats } from '../services/priceDiscovery'

interface Props {
  tokenId?: bigint
  currentPrice?: bigint
  auctionId?: number
}

const props = defineProps<Props>()

const stats = ref<PriceStats | null>(null)
const suggestedRange = ref<{ min: bigint; max: bigint; confidence: string } | null>(null)
const watchers = ref(0)
const loading = ref(true)

const floorPriceDisplay = computed(() => {
  if (!stats.value || stats.value.floorPrice === 0n) return 'N/A'
  return priceDiscovery.formatPrice(stats.value.floorPrice) + ' STT'
})

const volumeDisplay = computed(() => {
  if (!stats.value) return 'N/A'
  return priceDiscovery.formatPrice(stats.value.totalVolume) + ' STT'
})

const suggestedMin = computed(() => {
  if (!suggestedRange.value) return 'N/A'
  return priceDiscovery.formatPrice(suggestedRange.value.min) + ' STT'
})

const suggestedMax = computed(() => {
  if (!suggestedRange.value) return 'N/A'
  return priceDiscovery.formatPrice(suggestedRange.value.max) + ' STT'
})

const confidenceColor = computed(() => {
  if (!suggestedRange.value) return 'gray'
  switch (suggestedRange.value.confidence) {
    case 'high': return 'text-green-600 bg-green-100'
    case 'medium': return 'text-yellow-600 bg-yellow-100'
    case 'low': return 'text-gray-600 bg-gray-100'
    default: return 'gray'
  }
})

const isPriceInRange = computed(() => {
  if (!props.currentPrice || !suggestedRange.value) return true
  return props.currentPrice >= suggestedRange.value.min && 
         props.currentPrice <= suggestedRange.value.max
})

onMounted(async () => {
  loading.value = true
  
  try {
    const [statsData, suggested, watcherCount] = await Promise.all([
      priceDiscovery.getPriceStats(),
      props.tokenId ? priceDiscovery.getSuggestedPrice(props.tokenId) : null,
      props.auctionId ? priceDiscovery.getWatcherCount(props.auctionId) : 0,
    ])
    
    stats.value = statsData
    suggestedRange.value = suggested
    watchers.value = watcherCount
  } catch (error) {
    console.error('Failed to load price data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Market Insights</h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <template v-else>
      <!-- Price Stats Grid -->
      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
          <div class="flex items-center space-x-2 mb-2">
            <DollarSign :size="18" class="text-blue-500" />
            <span class="text-sm font-medium text-gray-600">Floor Price</span>
          </div>
          <p class="text-2xl font-bold text-blue-600">{{ floorPriceDisplay }}</p>
        </div>

        <div class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
          <div class="flex items-center space-x-2 mb-2">
            <TrendingUp :size="18" class="text-purple-500" />
            <span class="text-sm font-medium text-gray-600">Volume</span>
          </div>
          <p class="text-xl font-bold text-purple-600">{{ volumeDisplay }}</p>
        </div>
      </div>

      <!-- Suggested Price Range -->
      <div v-if="suggestedRange" class="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2">
            <Zap :size="18" class="text-yellow-500" />
            <span class="text-sm font-medium text-gray-700">Suggested Price</span>
          </div>
          <span :class="confidenceColor" class="px-2 py-1 rounded-full text-xs font-medium">
            {{ suggestedRange.confidence }} confidence
          </span>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-500 mb-1">Range</p>
            <p class="text-lg font-bold text-gray-900">{{ suggestedMin }} - {{ suggestedMax }}</p>
          </div>
          
          <div v-if="currentPrice" class="text-right">
            <p class="text-xs text-gray-500 mb-1">Current</p>
            <p 
              class="text-lg font-bold"
              :class="isPriceInRange ? 'text-green-600' : 'text-orange-600'"
            >
              {{ priceDiscovery.formatPrice(currentPrice) }} STT
            </p>
            <p v-if="!isPriceInRange" class="text-xs text-orange-600">
              Outside suggested range
            </p>
          </div>
        </div>
      </div>

      <!-- Activity Metrics -->
      <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div class="flex items-center space-x-2 mb-3">
          <Eye :size="18" class="text-gray-500" />
          <span class="text-sm font-medium text-gray-700">Activity</span>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-sm text-gray-600">{{ watchers }} watching</span>
          </div>
          
          <div class="text-sm text-gray-500">
            {{ stats?.salesCount || 0 }} sales
          </div>
        </div>
      </div>

      <!-- Info Note -->
      <div class="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <AlertCircle :size="16" class="text-blue-500 mt-0.5 flex-shrink-0" />
        <p class="text-xs text-blue-700">
          Prices are estimates based on collection activity. Always do your own research.
        </p>
      </div>
    </template>
  </div>
</template>
