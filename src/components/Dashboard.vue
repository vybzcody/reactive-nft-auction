<script setup lang="ts">
import Header from './Header.vue'
import Sidebar from './Sidebar.vue'
import Feed from './Feed.vue'

interface Props {
  currentView?: string
}

defineProps<Props>()

interface NFTCard {
  id: number
  tokenId: bigint
  seller: string
  highestBidder: string
  highestBid: bigint
  endTime: bigint
  finalized: boolean
  bidCount: bigint
  image: string
  rating: string
}

const emit = defineEmits<{
  select: [nft: NFTCard]
  create: []
  myNfts: []
  navigate: [view: string]
}>()

const handleSelectNFT = (nft: NFTCard) => {
  emit('select', nft)
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <Header 
      :current-view="currentView"
      @create="() => emit('create')"
      @my-nfts="() => emit('myNfts')"
      @navigate="(view) => emit('navigate', view)"
    />
    <div class="flex">
      <Sidebar />
      <Feed @select="handleSelectNFT" />
    </div>
  </div>
</template>
