<script setup lang="ts">
import { ref } from 'vue'
import Landing from './components/Landing.vue'
import Dashboard from './components/Dashboard.vue'
import NFTMarketplace from './components/NFTMarketplace.vue'
import NFTDetails from './components/NFTDetails.vue'
import CreateAuction from './components/CreateAuction.vue'
import MyNFTs from './components/MyNFTs.vue'
import Toast from './components/Toast.vue'
import ReactiveNotification from './components/ReactiveNotification.vue'
import { useToast } from './composables/useToast'

type ViewState = 'landing' | 'dashboard' | 'marketplace' | 'details' | 'create' | 'my-nfts'

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

const currentView = ref<ViewState>('landing')
const selectedNFT = ref<NFTCard | null>(null)
const notificationsRef = ref<InstanceType<typeof ReactiveNotification> | null>(null)

const { toasts, dismissToast, dismissAllToasts } = useToast()

const navigateTo = (view: ViewState) => {
  currentView.value = view
}

const handleSelectNFT = (nftData: any) => {
  selectedNFT.value = {
    ...nftData,
    tokenId: BigInt(nftData.tokenId),
  }
  currentView.value = 'details'
}

const handleBackToDashboard = () => {
  selectedNFT.value = null
  currentView.value = 'dashboard'
}

const handleCreate = (tokenId?: number) => {
  currentView.value = 'create'
  // If tokenId provided, it will be passed to CreateAuction component
}

const handleMyNFTs = () => {
  currentView.value = 'my-nfts'
}

const handleCreated = () => {
  currentView.value = 'dashboard'
}

const openNotifications = () => {
  // Trigger the notification panel to open
  const event = new CustomEvent('open-notifications')
  window.dispatchEvent(event)
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Toast Notifications -->
    <Toast
      :toasts="toasts"
      @dismiss="dismissToast"
      @dismiss-all="dismissAllToasts"
    />

    <!-- On-Chain Reactive Notifications -->
    <ReactiveNotification />

    <!-- Main Content -->
    <Landing v-if="currentView === 'landing'" @navigate="navigateTo" />
    <Dashboard
      v-else-if="currentView === 'dashboard'"
      :current-view="currentView"
      @select="handleSelectNFT"
      @navigate="navigateTo"
      @create="handleCreate"
      @my-nfts="handleMyNFTs"
      @open-notifications="openNotifications"
    />
    <NFTMarketplace
      v-else-if="currentView === 'marketplace'"
      @select="handleSelectNFT"
      @back="handleBackToDashboard"
    />
    <NFTDetails
      v-else-if="currentView === 'details' && selectedNFT"
      :nft="selectedNFT"
      :is-auction="selectedNFT.id !== undefined"
      @back="handleBackToDashboard"
      @bid="handleBackToDashboard"
      @create-auction="handleCreate"
    />
    <CreateAuction
      v-else-if="currentView === 'create'"
      :preselected-token-id="selectedNFT?.id"
      @back="handleBackToDashboard"
      @created="handleCreated"
    />
    <MyNFTs
      v-else-if="currentView === 'my-nfts'"
      @back="handleBackToDashboard"
      @select="handleSelectNFT"
    />
  </div>
</template>
