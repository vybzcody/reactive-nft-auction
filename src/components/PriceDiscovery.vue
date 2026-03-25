<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-vue-next'
import { publicClient } from '../config/clients'
import { AUCTION_CONTRACT_ADDRESS, AUCTION_ABI, NFT_CONTRACT_ADDRESS, NFT_ABI } from '../config/contract'

interface Props {
  tokenId?: bigint
  currentPrice?: bigint
  auctionId?: number
}

const props = defineProps<Props>()

const totalSupply = ref<bigint>(0n)
const userBalance = ref<bigint>(0n)
const loading = ref(true)

const formatEther = (wei: bigint) => (Number(wei) / 1e18).toFixed(4)

onMounted(async () => {
  loading.value = true
  console.log('📊 Loading price discovery...')

  try {
    const supply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    })
    totalSupply.value = supply
    console.log('✅ Total supply:', supply.toString())
  } catch (error) {
    console.error('Failed to load collection data:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Collection Info</h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <template v-else>
      <!-- Total Supply -->
      <div class="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
        <div class="flex items-center space-x-2 mb-2">
          <DollarSign :size="18" class="text-blue-500" />
          <span class="text-sm font-medium text-gray-600">Total NFTs Minted</span>
        </div>
        <p class="text-3xl font-bold text-blue-600">{{ totalSupply.toString() }}</p>
      </div>

      <!-- Current Auction Price -->
      <div v-if="currentPrice" class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
        <div class="flex items-center space-x-2 mb-2">
          <TrendingUp :size="18" class="text-purple-500" />
          <span class="text-sm font-medium text-gray-600">Current Bid</span>
        </div>
        <p class="text-2xl font-bold text-purple-600">{{ formatEther(currentPrice) }} STT</p>
      </div>

      <!-- Info Note -->
      <div class="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <AlertCircle :size="16" class="text-blue-500 mt-0.5 flex-shrink-0" />
        <p class="text-xs text-blue-700">
          Collection stats are read directly from the blockchain.
        </p>
      </div>
    </template>
  </div>
</template>
