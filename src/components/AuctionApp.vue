<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuction, type Auction } from '../composables/useAuction'
import Alert from './ui/Alert.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import Card from './ui/Card.vue'
import { Zap, Clock, TrendingUp, AlertCircle } from 'lucide-vue-next'

const { account, chainId, isConnected, isCorrectChain, connect, switchChain, getActiveAuctions, getAuction, createAuction, placeBid, formatEther } = useAuction()

const auctions = ref<Auction[]>([])
const loading = ref(false)
const error = ref('')

const newTokenId = ref('')
const newDuration = ref('24')
const bidAuctionId = ref('')
const bidAmount = ref('')

const loadAuctions = async () => {
  try {
    loading.value = true
    const activeIds = await getActiveAuctions()
    const auctionData = await Promise.all(activeIds.map(id => getAuction(id)))
    auctions.value = auctionData
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load auctions'
  } finally {
    loading.value = false
  }
}

const handleConnect = async () => {
  try {
    await connect()
    if (isCorrectChain.value) {
      await loadAuctions()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to connect wallet'
  }
}

const handleSwitchChain = async () => {
  try {
    await switchChain()
    await loadAuctions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to switch chain'
  }
}

const handleCreateAuction = async () => {
  try {
    if (!newTokenId.value || !newDuration.value) return
    loading.value = true
    await createAuction(parseInt(newTokenId.value), parseInt(newDuration.value))
    newTokenId.value = ''
    newDuration.value = '24'
    await loadAuctions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create auction'
  } finally {
    loading.value = false
  }
}

const handlePlaceBid = async () => {
  try {
    if (!bidAuctionId.value || !bidAmount.value) return
    loading.value = true
    await placeBid(parseInt(bidAuctionId.value), bidAmount.value)
    bidAuctionId.value = ''
    bidAmount.value = ''
    await loadAuctions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to place bid'
  } finally {
    loading.value = false
  }
}

const formatTime = (timestamp: bigint) => {
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

const isAuctionActive = (auction: Auction) => {
  return !auction.finalized && Date.now() < Number(auction.endTime) * 1000
}

onMounted(() => {
  if (isConnected.value) {
    loadAuctions()
  }
})
</script>

<template>
  <div class="min-h-screen bg-space-dark">
    <!-- Animated Background -->
    <div class="fixed inset-0 bg-grid pointer-events-none"></div>
    <div class="fixed inset-0 bg-radial-glow pointer-events-none"></div>

    <div class="relative max-w-6xl mx-auto p-6">
      <h1 class="text-4xl lg:text-5xl font-bold mb-8 text-center">
        <span class="gradient-text-primary">Reactive</span> <span class="gradient-text-secondary">NFT Auction</span>
      </h1>

      <!-- Connection Status -->
      <Card v-if="!isConnected" class="mb-6 text-center">
        <Button @click="handleConnect" color="cyan">
          <Zap :size="18" class="mr-2" />
          Connect Wallet
        </Button>
      </Card>
      <Card v-else class="mb-6">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-cyber-green font-semibold flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-cyber-green animate-pulse"></span>
              <span>Connected: {{ account?.slice(0, 6) }}...{{ account?.slice(-4) }}</span>
            </span>
            <span class="text-sm text-muted-foreground">
              Chain: {{ chainId }}
              <span v-if="!isCorrectChain" class="text-cyber-red">(Wrong Network)</span>
              <span v-else class="text-cyber-green">(Somnia Testnet)</span>
            </span>
          </div>
          <Button
            v-if="!isCorrectChain"
            color="orange"
            variant="secondary"
            @click="handleSwitchChain"
            class="w-full"
          >
            Switch to Somnia Testnet
          </Button>
        </div>
      </Card>

      <!-- Error Display -->
      <Alert
        v-if="error"
        type="error"
        title="Error"
        :message="error"
        :show="!!error"
        dismissible
        @dismiss="error = ''"
        class="mb-6"
      />

      <!-- Wrong Network Warning -->
      <Alert
        v-if="isConnected && !isCorrectChain"
        type="warning"
        title="Wrong Network"
        message="Please switch to Somnia Testnet to use the auction features."
        class="mb-6"
      />

      <!-- Loading -->
      <Alert
        v-if="loading"
        type="info"
        title="Processing"
        message="Processing your request..."
        class="mb-6"
      />

      <div v-if="isConnected && isCorrectChain" class="grid gap-6">
        <!-- Create Auction -->
        <Card title="Create Auction">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              v-model="newTokenId"
              type="number"
              label="Token ID"
              placeholder="Enter token ID"
            />
            <Input
              v-model="newDuration"
              type="number"
              label="Duration (hours)"
              placeholder="Duration in hours"
            />
            <div class="flex items-end">
              <Button
                color="green"
                :disabled="loading || !newTokenId || !newDuration"
                @click="handleCreateAuction"
                class="w-full"
              >
                <Zap :size="18" class="mr-2" />
                Create Auction
              </Button>
            </div>
          </div>
        </Card>

        <!-- Place Bid -->
        <Card title="Place Bid">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              v-model="bidAuctionId"
              type="number"
              label="Auction ID"
              placeholder="Enter auction ID"
            />
            <Input
              v-model="bidAmount"
              type="number"
              step="0.001"
              label="Bid Amount (STT)"
              placeholder="Enter bid amount"
            />
            <div class="flex items-end">
              <Button
                color="cyan"
                :disabled="loading || !bidAuctionId || !bidAmount"
                @click="handlePlaceBid"
                class="w-full"
              >
                <TrendingUp :size="18" class="mr-2" />
                Place Bid
              </Button>
            </div>
          </div>
        </Card>

        <!-- Active Auctions -->
        <Card title="Active Auctions">
          <div class="mb-4">
            <Button
              variant="outline"
              @click="loadAuctions"
              :disabled="loading"
            >
              <Clock :size="16" class="mr-2" />
              Refresh Auctions
            </Button>
          </div>

          <div v-if="auctions.length === 0" class="text-center py-12 text-muted-foreground">
            <Clock :size="48" class="mx-auto mb-4 opacity-50" />
            <p>No active auctions found</p>
          </div>

          <div v-else class="grid gap-4">
            <div
              v-for="auction in auctions"
              :key="auction.id"
              class="border border-border/50 rounded-xl p-4 transition-all hover:border-cyber-cyan/50 hover:shadow-lg hover:shadow-cyber-cyan/10"
              :class="isAuctionActive(auction) ? 'bg-cyber-green/5' : 'bg-space-light/50'"
            >
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span class="text-muted-foreground">ID:</span>
                  <span class="ml-1 text-foreground font-semibold">{{ auction.id }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Token:</span>
                  <span class="ml-1 text-foreground">{{ auction.tokenId.toString() }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Seller:</span>
                  <span class="ml-1 font-mono text-xs text-muted-foreground">{{ auction.seller.slice(0, 6) }}...{{ auction.seller.slice(-4) }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Status:</span>
                  <span
                    class="ml-1 px-2 py-1 rounded-full text-xs font-semibold"
                    :class="isAuctionActive(auction) ? 'bg-cyber-green/10 text-cyber-green' : 'bg-cyber-red/10 text-cyber-red'"
                  >
                    {{ isAuctionActive(auction) ? '● Active' : '○ Ended' }}
                  </span>
                </div>
                <div>
                  <span class="text-muted-foreground">Highest Bid:</span>
                  <span class="ml-1 font-mono text-cyber-cyan font-semibold">{{ formatEther(auction.highestBid) }} STT</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Bidder:</span>
                  <span class="ml-1 font-mono text-xs text-muted-foreground">
                    {{ auction.highestBidder === '0x0000000000000000000000000000000000000000'
                       ? 'None'
                       : auction.highestBidder.slice(0, 6) + '...' + auction.highestBidder.slice(-4) }}
                  </span>
                </div>
                <div>
                  <span class="text-muted-foreground">End Time:</span>
                  <span class="ml-1 text-foreground">{{ formatTime(auction.endTime) }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground">Bids:</span>
                  <span class="ml-1 text-foreground">{{ auction.bidCount.toString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
