<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { parseEther } from 'viem'
import { Clock, TrendingUp, X, Check, AlertCircle, Zap, DollarSign, Layers } from 'lucide-vue-next'
import { useNFT } from '../composables/useNFT'
import { useAuction } from '../composables/useAuction'

const emit = defineEmits<{
  created: [auctionId: number]
  close: []
}>()

const { userNFTs, approveForAuction, isApprovedForAuction, loading: nftLoading } = useNFT()
const { createAuction } = useAuction()

const selectedTokenId = ref<number | null>(null)
const durationMinutes = ref(60)
const reservePrice = ref<string>('0')
const approving = ref(false)
const creating = ref(false)
const approved = ref<Record<number, boolean>>({})
const createError = ref('')

const durationOptions = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '6h', value: 360 },
  { label: '12h', value: 720 },
  { label: '24h', value: 1440 },
]

const loading = computed(() => (nftLoading.value || false) || approving.value || creating.value)

const selectedNFT = computed(() => {
  if (selectedTokenId.value === null || !userNFTs.value?.length) return null
  return userNFTs.value.find(n => Number(n.tokenId) === selectedTokenId.value) || null
})

const checkApprovals = async () => {
  if (!userNFTs.value?.length) {
    approved.value = {}
    return
  }

  const newApproved: Record<number, boolean> = {}
  for (const nft of userNFTs.value) {
    const tokenId = Number(nft.tokenId)
    newApproved[tokenId] = await isApprovedForAuction(tokenId)
  }
  approved.value = newApproved
}

const handleApprove = async (tokenId: number) => {
  try {
    approving.value = true
    createError.value = ''
    await approveForAuction(tokenId)
    approved.value[tokenId] = true
  } catch (err) {
    console.error('Approval error:', err)
    createError.value = err instanceof Error ? err.message : 'Failed to approve NFT'
  } finally {
    approving.value = false
  }
}

const handleCreateAuction = async () => {
  const tokenId = selectedTokenId.value
  const isApproved = tokenId !== null ? approved.value[tokenId] : false
  const durationSeconds = durationMinutes.value * 60

  if (tokenId === null) {
    createError.value = 'Please select an NFT first'
    return
  }

  if (!isApproved) {
    createError.value = 'Please approve the NFT for auction first'
    return
  }

  if (durationMinutes.value < 1) {
    createError.value = 'Duration must be at least 1 minute'
    return
  }

  if (durationMinutes.value > 1440) {
    createError.value = 'Duration cannot exceed 24 hours'
    return
  }

  try {
    creating.value = true
    createError.value = ''

    const reserveValue = reservePrice.value === '' || reservePrice.value === null || reservePrice.value === undefined ? '0' : String(reservePrice.value)
    const reserveWei = parseEther(reserveValue)

    await createAuction(tokenId, durationSeconds, reserveWei)
    emit('created', 0)
  } catch (err) {
    console.error('Create auction error:', err)
    const errorMessage = err instanceof Error ? err.message : String(err)

    if (errorMessage.includes('Duration too short')) {
      createError.value = 'Duration must be at least 1 minute'
    } else if (errorMessage.includes('Duration too long')) {
      createError.value = 'Duration cannot exceed 24 hours'
    } else if (errorMessage.includes('Not NFT owner')) {
      createError.value = 'You do not own this NFT'
    } else if (errorMessage.includes('Contract not approved')) {
      createError.value = 'Please approve the auction contract'
    } else if (errorMessage.includes('reverted') || errorMessage.includes('Internal')) {
      createError.value = 'Transaction failed. Check your STT balance for gas.'
    } else if (errorMessage.includes('insufficient funds')) {
      createError.value = 'Insufficient STT for gas fees'
    } else {
      createError.value = 'Failed to create auction. Please try again.'
    }
  } finally {
    creating.value = false
  }
}

watch(() => userNFTs.value, checkApprovals, { immediate: true })
</script>

<template>
  <div class="fixed inset-0 bg-space-dark/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
    <div class="card-gradient max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyber-purple/20">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 pb-6 border-b border-border/50">
        <div>
          <div class="flex items-center space-x-2 mb-2">
            <TrendingUp :size="20" class="text-cyber-purple" />
            <h2 class="text-2xl font-bold gradient-text-secondary">Create Auction</h2>
          </div>
          <p class="text-sm text-muted-foreground">List your NFT for public bidding</p>
        </div>
        <button
          @click="$emit('close')"
          class="w-10 h-10 rounded-lg bg-space-light border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-cyber-purple/50 transition-all"
        >
          <X :size="20" />
        </button>
      </div>

      <!-- Step 1: Select NFT -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center text-sm font-bold mr-3 text-white">1</span>
          Select Your NFT
        </h3>

        <div v-if="userNFTs.length === 0" class="text-center py-12 bg-space-light/50 rounded-xl border border-border/50">
          <AlertCircle :size="48" class="mx-auto mb-4 text-cyber-orange" />
          <p class="text-muted-foreground">No NFTs owned yet</p>
          <p class="text-sm text-muted-foreground mt-2">Mint an NFT first to create an auction</p>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="nft in userNFTs"
            :key="nft.tokenId.toString()"
            @click="selectedTokenId = Number(nft.tokenId)"
            class="cursor-pointer group"
          >
            <div
              class="rounded-xl overflow-hidden border-2 transition-all duration-300 relative"
              :class="selectedTokenId === Number(nft.tokenId)
                ? 'border-cyber-purple bg-cyber-purple/10 shadow-lg shadow-cyber-purple/20'
                : 'border-border/50 bg-space-light hover:border-cyber-cyan/50 hover:shadow-lg hover:shadow-cyber-cyan/10'"
            >
              <!-- NFT Image -->
              <div class="aspect-square bg-space-medium relative overflow-hidden">
                <img
                  :src="nft.image"
                  :alt="`NFT #${nft.tokenId}`"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                <!-- Approval Badge -->
                <div
                  v-if="approved[Number(nft.tokenId)]"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-br from-cyber-green to-cyber-cyan flex items-center justify-center shadow-lg"
                >
                  <Check :size="14" class="text-white" />
                </div>
              </div>

              <!-- NFT Info -->
              <div class="p-3">
                <p class="text-sm font-medium text-foreground">NFT #{{ nft.tokenId }}</p>
                <p class="text-xs text-muted-foreground">{{ nft.styleName }}</p>

                <!-- Approval Status -->
                <div class="mt-2 flex items-center justify-between">
                  <span class="text-xs font-medium" :class="approved[Number(nft.tokenId)] ? 'text-cyber-green' : 'text-muted-foreground'">
                    {{ approved[Number(nft.tokenId)] ? '✓ Approved' : '○ Not Approved' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Approval -->
      <div v-if="selectedNFT && !approved[Number(selectedNFT.tokenId)]" class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center text-sm font-bold mr-3 text-white">2</span>
          Approve Auction Contract
        </h3>

        <div class="p-4 bg-cyber-orange/10 border border-cyber-orange/30 rounded-xl backdrop-blur-sm">
          <div class="flex items-start space-x-3">
            <AlertCircle :size="20" class="text-cyber-orange mt-0.5 flex-shrink-0" />
            <div class="text-sm text-muted-foreground">
              <p class="font-semibold text-cyber-orange mb-1">Approval Required</p>
              <p>
                Approve the auction contract to transfer your NFT. This is a one-time transaction per NFT.
              </p>
            </div>
          </div>
        </div>

        <button
          @click="handleApprove(Number(selectedNFT.tokenId))"
          :disabled="approving"
          class="mt-4 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ approving ? 'Approving...' : 'Approve NFT Transfer' }}
        </button>
      </div>

      <!-- Step 3: Set Duration -->
      <div v-if="selectedNFT && approved[Number(selectedNFT.tokenId)]" class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center text-sm font-bold mr-3 text-white">3</span>
          Set Auction Duration
        </h3>

        <p class="text-sm text-muted-foreground mb-4">Choose how long your auction will run</p>

        <!-- Quick Duration Options -->
        <div class="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          <button
            v-for="option in durationOptions"
            :key="option.value"
            @click="durationMinutes = option.value"
            class="p-3 rounded-xl border-2 transition-all text-sm group"
            :class="durationMinutes === option.value
              ? 'border-cyber-purple bg-cyber-purple/10 shadow-lg shadow-cyber-purple/20'
              : 'border-border/50 bg-space-light hover:border-cyber-cyan/50'"
          >
            <p class="text-foreground font-semibold">{{ option.label }}</p>
          </button>
        </div>

        <div class="mt-4 p-4 bg-space-light/50 rounded-xl border border-border/50">
          <label class="text-sm text-muted-foreground mb-2 block">Custom Duration (minutes)</label>
          <div class="flex items-center space-x-3">
            <input
              v-model.number="durationMinutes"
              type="number"
              min="1"
              max="1440"
              placeholder="Enter minutes"
              class="flex-1 input-field"
            />
            <span class="text-muted-foreground whitespace-nowrap text-sm font-medium">= {{ (durationMinutes / 60).toFixed(1) }}h</span>
          </div>
        </div>
      </div>

      <!-- Step 4: Set Reserve Price -->
      <div v-if="selectedNFT && approved[Number(selectedNFT.tokenId)]" class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center text-sm font-bold mr-3 text-white">4</span>
          Set Reserve Price <span class="text-muted-foreground text-sm ml-2 font-normal">(Optional)</span>
        </h3>

        <p class="text-sm text-muted-foreground mb-4">Minimum price to sell. Leave at 0 for no reserve.</p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <button
            v-for="reserve in [0, 0.1, 0.5, 1]"
            :key="reserve"
            @click="reservePrice = String(reserve)"
            class="p-3 rounded-xl border-2 transition-all text-sm group"
            :class="reservePrice === String(reserve)
              ? 'border-cyber-green bg-cyber-green/10 shadow-lg shadow-cyber-green/20'
              : 'border-border/50 bg-space-light hover:border-cyber-cyan/50'"
          >
            <p class="text-foreground font-semibold">{{ reserve === 0 ? 'No Reserve' : reserve + ' STT' }}</p>
          </button>
        </div>

        <div class="mt-4 p-4 bg-space-light/50 rounded-xl border border-border/50">
          <label class="text-sm text-muted-foreground mb-2 block">Custom Reserve (STT)</label>
          <input
            v-model="reservePrice"
            type="number"
            min="0"
            step="0.001"
            placeholder="Enter minimum price in STT"
            class="w-full input-field"
          />
        </div>
      </div>

      <!-- Preview -->
      <div v-if="selectedNFT && approved[Number(selectedNFT.tokenId)]" class="mb-8 p-6 bg-space-light/50 rounded-xl border border-border/50">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Zap :size="20" class="mr-2 text-cyber-orange" />
          Auction Preview
        </h3>
        <div class="flex items-center space-x-6">
          <div class="w-24 h-24 rounded-xl overflow-hidden bg-space-medium border-2 border-cyber-purple/30 shadow-lg shadow-cyber-purple/10">
            <img
              :src="selectedNFT.image"
              :alt="`NFT #${selectedNFT.tokenId}`"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-muted-foreground">NFT</p>
                <p class="text-foreground font-semibold">#{{ selectedNFT.tokenId }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Duration</p>
                <p class="text-foreground font-semibold">{{ durationMinutes }} min</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Reserve</p>
                <p class="text-cyber-green font-semibold">{{ reservePrice === '0' ? 'None' : reservePrice + ' STT' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Extension</p>
                <p class="text-cyber-cyan font-semibold">2min protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="createError" class="mb-6 p-4 bg-cyber-red/10 border border-cyber-red/30 rounded-xl backdrop-blur-sm">
        <div class="flex items-start space-x-3">
          <AlertCircle :size="20" class="text-cyber-red mt-0.5 flex-shrink-0" />
          <div class="text-sm text-muted-foreground">
            <p class="font-semibold text-cyber-red mb-1">Error</p>
            <p>{{ createError }}</p>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <button
        @click="handleCreateAuction"
        :disabled="!selectedNFT || !approved[Number(selectedNFT?.tokenId)] || loading"
        class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <Zap :size="18" />
        <span>{{ creating ? 'Creating Auction...' : 'Create Auction' }}</span>
      </button>

      <!-- Info -->
      <div class="mt-6 p-4 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl backdrop-blur-sm">
        <div class="flex items-start space-x-3">
          <Clock :size="20" class="text-cyber-cyan mt-0.5 flex-shrink-0" />
          <div class="text-sm text-muted-foreground">
            <p class="font-semibold text-cyber-cyan mb-1">Sniper Protection</p>
            <p>
              Bids in the last 2 minutes automatically extend the auction by 2 minutes.
              This ensures fair bidding and prevents last-second sniping.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
