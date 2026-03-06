<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Plus, Image, Zap, AlertCircle } from 'lucide-vue-next'
import { useNFT } from '../composables/useNFT'
import { useAuction } from '../composables/useAuction'

const emit = defineEmits<{
  back: []
  select: [tokenId: number]
}>()

const { userNFTs, loadUserNFTs, loading: nftLoading, error: nftError } = useNFT()
const { account, isConnected } = useAuction()

const loading = ref(false)

const loadNFTs = async () => {
  if (!account.value) return
  loading.value = true
  await loadUserNFTs(account.value)
  loading.value = false
}

const handleSelectNFT = (nft: any) => {
  emit('select', nft)
}

onMounted(() => {
  if (isConnected.value && account.value) {
    loadNFTs()
  }
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="header-main border-b border-gray-200">
      <div class="max-w-[1920px] mx-auto px-4">
        <div class="flex items-center justify-between h-20">
          <!-- Left: Back Button + Title -->
          <div class="flex items-center space-x-4">
            <button @click="$emit('back')" class="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors">
              <ArrowLeft :size="20" />
              <span class="font-medium">Back</span>
            </button>
            <h1 class="text-xl font-bold text-gray-900">My NFTs</h1>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center space-x-4">
            <button
              @click="loadNFTs"
              class="text-gray-600 hover:text-blue-500 font-medium transition-colors"
            >
              {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1920px] mx-auto px-4 py-8">
      <!-- Not Connected -->
      <div v-if="!isConnected" class="text-center py-20">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle :size="48" class="text-gray-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Wallet Not Connected</h3>
        <p class="text-gray-500 mb-6">Connect your wallet to view your NFTs</p>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex items-center justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <!-- No NFTs -->
      <div v-else-if="userNFTs.length === 0" class="text-center py-20">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Image :size="48" class="text-gray-400" />
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No NFTs Yet</h3>
        <p class="text-gray-500 mb-6">You don't own any NFTs yet</p>
        <button @click="$emit('back')" class="btn-opensea btn-primary px-6 py-3 rounded-xl">
          Mint Your First NFT
        </button>
      </div>

      <!-- NFT Grid -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div
          v-for="nft in userNFTs"
          :key="nft.tokenId"
          @click="handleSelectNFT({ ...nft, isAuction: false })"
          class="card-nft cursor-pointer group"
        >
          <div class="relative aspect-square overflow-hidden bg-gray-100">
            <img
              :src="nft.image"
              :alt="`NFT #${nft.tokenId}`"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
              <span class="text-white text-sm font-medium">Click to select</span>
            </div>
          </div>
          <div class="p-4 space-y-2">
            <h3 class="font-semibold text-gray-900 group-hover:text-blue-500 transition-colors">
              {{ nft.metadata || `NFT #${nft.tokenId.toString()}` }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ nft.style === -1 ? 'Custom Upload' : nft.styleName }}
            </p>
            <div v-if="nft.style === -1" class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span class="text-xs text-green-600 font-medium">Custom NFT</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
