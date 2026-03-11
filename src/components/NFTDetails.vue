<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { parseEther } from 'viem'
import { ArrowLeft, Clock, TrendingUp, DollarSign, Heart, Share2, MoreVertical, Zap, CheckCircle, Plus, Upload, Image as ImageIcon } from 'lucide-vue-next'
import { useAuction } from '../composables/useAuction'
import { useNFT } from '../composables/useNFT'
import { storacha } from '../services/storacha'
import { bidHistory, type BidRecord } from '../services/bidHistory'
import BidHistory from './BidHistory.vue'
import PriceDiscovery from './PriceDiscovery.vue'

interface NFTCard {
  id?: number
  tokenId: bigint
  seller?: string
  owner?: string
  highestBidder?: string
  highestBid?: bigint
  endTime?: bigint
  finalized?: boolean
  bidCount?: bigint
  image: string
  rating?: string
  reservePrice?: bigint
  reserveMet?: boolean
  styleName?: string
  customImage?: string  // For uploaded images
}

interface Props {
  nft: NFTCard
  isAuction?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAuction: true
})

const emit = defineEmits<{
  back: []
  bid: [amount: string]
  createAuction: [tokenId: number]
}>()

const { isConnected, placeBid, formatEther } = useAuction()
const { approveForAuction, isApprovedForAuction } = useNFT()

const bidAmount = ref('')
const submitting = ref(false)
const error = ref('')
const success = ref('')
const timeLeft = ref<{ hours: number; minutes: number; seconds: number } | null>(null)
const auctionEnded = ref(false)
const approved = ref(false)

// Custom image upload
const uploadMode = ref<'dicebear' | 'custom'>('dicebear')
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadedImage = ref<string>('')
const uploadProgress = ref(0)

const updateCountdown = () => {
  if (!props.nft.endTime) return
  const diff = Number(props.nft.endTime) * 1000 - Date.now()
  if (diff <= 0) {
    timeLeft.value = null
    auctionEnded.value = true
    return
  }
  auctionEnded.value = false
  timeLeft.value = {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

let countdownInterval: number
onMounted(async () => {
  if (props.isAuction) {
    updateCountdown()
    countdownInterval = window.setInterval(updateCountdown, 1000)
  } else {
    if (props.nft.tokenId) {
      approved.value = await isApprovedForAuction(Number(props.nft.tokenId))
    }
  }
})
onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

const minimumBid = computed(() => {
  if (!props.nft.highestBid) return 0n
  const current = props.nft.highestBid
  const minIncrement = current + (current * 1000n / 10000n)
  if (props.nft.reservePrice && props.nft.reservePrice > minIncrement) {
    return props.nft.reservePrice
  }
  return minIncrement
})

const handlePlaceBid = async () => {
  if (!bidAmount.value) {
    error.value = 'Please enter a bid amount'
    return
  }
  if (!isConnected.value) {
    error.value = 'Please connect your wallet first'
    return
  }

  const bidValue = parseEther(String(bidAmount.value))
  if (bidValue < minimumBid.value) {
    error.value = `Bid must be at least ${formatEther(minimumBid.value)} STT`
    return
  }

  try {
    submitting.value = true
    error.value = ''
    
    // Record bid in history
    bidHistory.addBid(props.nft.id!, {
      bidder: props.nft.highestBidder || '0x0000000000000000000000000000000000000000',
      amount: bidValue,
      timestamp: Date.now(),
      isProxy: false,
    })
    
    await placeBid(props.nft.id!, String(bidAmount.value))
    success.value = 'Bid placed successfully!'
    bidAmount.value = ''
    setTimeout(() => emit('back'), 2000)
  } catch (err: any) {
    console.error('Place bid error:', err)
    error.value = err.message || 'Failed to place bid'
  } finally {
    submitting.value = false
  }
}

const handleApprove = async () => {
  try {
    await approveForAuction(Number(props.nft.tokenId))
    approved.value = true
  } catch (err) {
    console.error('Approval failed:', err)
  }
}

const handleCreateAuction = () => {
  emit('createAuction', Number(props.nft.tokenId))
}

const displaySeller = computed(() => {
  if (props.nft.seller) {
    return `${props.nft.seller.slice(0, 6)}...${props.nft.seller.slice(-4)}`
  }
  if (props.nft.owner) {
    return `${props.nft.owner.slice(0, 6)}...${props.nft.owner.slice(-4)}`
  }
  return 'Unknown'
})

// Image upload handlers
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const uploadToIPFS = async () => {
  if (!selectedFile.value) return
  
  try {
    uploading.value = true
    uploadProgress.value = 10
    
    const cid = await storacha.upload(selectedFile.value, (progress) => {
      uploadProgress.value = progress
    })
    
    uploadedImage.value = storacha.getGatewayUrl(cid)
    uploadProgress.value = 100
  } catch (err: any) {
    console.error('Upload failed:', err)
    error.value = err.message
  } finally {
    uploading.value = false
  }
}

const getMockBidHistory = (): BidRecord[] => {
  // Mock data for demonstration
  return [
    {
      id: 1,
      bidder: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: parseEther('0.5'),
      timestamp: Date.now() - 3600000,
      isProxy: false,
    },
    {
      id: 2,
      bidder: '0x8ba1f109551bD432803012645Hac136c0x89',
      amount: parseEther('0.75'),
      timestamp: Date.now() - 1800000,
      isProxy: true,
    },
  ]
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="header-main border-b border-gray-200">
      <div class="max-w-[1920px] mx-auto px-4">
        <div class="flex items-center justify-between h-20">
          <button @click="$emit('back')" class="flex items-center space-x-2 text-gray-600 hover:text-blue-500">
            <ArrowLeft :size="20" />
            <span class="font-medium">Back</span>
          </button>

          <h1 class="text-xl font-bold text-gray-900">
            {{ isAuction ? 'Auction Details' : 'NFT Details' }}
          </h1>

          <div class="flex items-center space-x-2">
            <button class="p-2 hover:bg-gray-100 rounded-full"><Heart :size="20" class="text-gray-600" /></button>
            <button class="p-2 hover:bg-gray-100 rounded-full"><Share2 :size="20" class="text-gray-600" /></button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1920px] mx-auto px-4 py-8">
      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Image -->
        <div class="space-y-4">
          <div class="card-nft overflow-hidden">
            <img :src="uploadedImage || nft.image" class="w-full aspect-square object-cover" />
          </div>

          <!-- Custom Image Upload (for owned NFTs) -->
          <div v-if="!isAuction" class="p-4 rounded-2xl border border-gray-200">
            <h3 class="text-lg font-semibold mb-4">Customize NFT Image</h3>
            
            <div class="flex space-x-4 mb-4">
              <button
                @click="uploadMode = 'dicebear'"
                class="flex-1 py-2 rounded-lg border-2 transition-all"
                :class="uploadMode === 'dicebear' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
              >
                <ImageIcon :size="20" class="mx-auto mb-1" />
                <span class="text-sm">DiceBear</span>
              </button>
              <button
                @click="uploadMode = 'custom'"
                class="flex-1 py-2 rounded-lg border-2 transition-all"
                :class="uploadMode === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
              >
                <Upload :size="20" class="mx-auto mb-1" />
                <span class="text-sm">Custom</span>
              </button>
            </div>

            <div v-if="uploadMode === 'custom'" class="space-y-3">
              <input
                type="file"
                @change="handleFileSelect"
                accept="image/*"
                class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              <button
                @click="uploadToIPFS"
                :disabled="!selectedFile || uploading"
                class="w-full btn-opensea btn-primary py-3 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Upload :size="18" />
                <span>{{ uploading ? `Uploading... ${uploadProgress}%` : 'Upload to IPFS' }}</span>
              </button>

              <img v-if="uploadedImage" :src="uploadedImage" class="w-full h-40 object-cover rounded-lg" />
            </div>
          </div>

          <!-- Bid History (for auctions) -->
          <div v-if="isAuction" class="card-nft p-6">
            <BidHistory 
              :bids="getMockBidHistory()"
              :current-highest-bidder="nft.highestBidder || ''"
            />
          </div>
        </div>

        <!-- Details -->
        <div class="space-y-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              {{ nft.metadata || `NFT #${nft.tokenId}` }}
            </h1>
            <p class="text-gray-500">Owner: {{ displaySeller }}</p>
            <div class="flex items-center space-x-4 mt-2">
              <p v-if="nft.styleName" class="text-sm text-gray-500">
                Style: {{ nft.style === -1 ? 'Custom Upload' : nft.styleName }}
              </p>
              <div v-if="nft.style === -1" class="flex items-center space-x-1">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-xs text-green-600 font-medium">Custom NFT</span>
              </div>
            </div>
          </div>

          <!-- Price Discovery -->
          <div class="card-nft p-6">
            <PriceDiscovery
              :token-id="nft.tokenId"
              :current-price="nft.highestBid"
              :auction-id="nft.id"
            />
          </div>

          <!-- AUCTION NFT -->
          <template v-if="isAuction">
            <!-- Current Bid -->
            <div class="p-6 rounded-2xl border-2 border-blue-500 bg-blue-50">
              <div class="flex items-center space-x-2 mb-3">
                <TrendingUp :size="20" class="text-blue-500" />
                <span class="text-sm font-medium text-gray-600">Current Bid</span>
              </div>
              <p class="text-4xl font-bold text-blue-500 mb-2">{{ formatEther(nft.highestBid || 0n) }} STT</p>
              <p class="text-sm text-gray-500">{{ nft.bidCount?.toString() || '0' }} bids placed</p>
            </div>

            <!-- Countdown -->
            <div v-if="timeLeft && !auctionEnded" class="p-6 rounded-2xl border border-gray-200">
              <div class="flex items-center space-x-2 mb-4">
                <Clock :size="20" class="text-gray-600" />
                <span class="font-medium">Auction ends in</span>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center p-4 bg-gray-50 rounded-xl">
                  <p class="text-3xl font-bold text-gray-900">{{ String(timeLeft.hours).padStart(2, '0') }}</p>
                  <p class="text-sm text-gray-500">hours</p>
                </div>
                <div class="text-center p-4 bg-gray-50 rounded-xl">
                  <p class="text-3xl font-bold text-gray-900">{{ String(timeLeft.minutes).padStart(2, '0') }}</p>
                  <p class="text-sm text-gray-500">minutes</p>
                </div>
                <div class="text-center p-4 bg-gray-50 rounded-xl">
                  <p class="text-3xl font-bold text-gray-900">{{ String(timeLeft.seconds).padStart(2, '0') }}</p>
                  <p class="text-sm text-gray-500">seconds</p>
                </div>
              </div>
            </div>

            <!-- Place Bid -->
            <div v-if="isConnected && !auctionEnded" class="p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 class="text-xl font-semibold">Place Your Bid</h3>
              <div>
                <label class="text-sm text-gray-500 mb-2 block">
                  Minimum bid: {{ formatEther(minimumBid) }} STT
                </label>
                <input
                  v-model="bidAmount"
                  type="number"
                  :min="formatEther(minimumBid)"
                  step="0.001"
                  class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  placeholder="Enter bid amount"
                />
              </div>
              <button
                @click="handlePlaceBid"
                :disabled="submitting || !bidAmount"
                class="w-full btn-opensea btn-primary py-4 text-lg disabled:opacity-50"
              >
                {{ submitting ? 'Placing...' : 'Place Bid' }}
              </button>
              <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
              <p v-if="success" class="text-green-500 text-sm">{{ success }}</p>
            </div>
          </template>

          <!-- OWNED NFT -->
          <template v-else>
            <div class="p-6 rounded-2xl border border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-semibold">Auction Status</h3>
                <div v-if="approved" class="flex items-center space-x-1 text-green-600">
                  <CheckCircle :size="20" />
                  <span class="font-medium">Approved</span>
                </div>
              </div>
              
              <p class="text-gray-600 mb-6">
                {{ approved 
                  ? 'This NFT is approved for auction. You can create an auction now.'
                  : 'This NFT is not yet approved for auction.'
                }}
              </p>

              <div class="space-y-3">
                <button
                  v-if="!approved"
                  @click="handleApprove"
                  class="w-full btn-opensea btn-secondary py-3"
                >
                  Approve for Auction
                </button>
                <button
                  @click="handleCreateAuction"
                  :disabled="!approved"
                  class="w-full btn-opensea btn-primary py-4 text-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Plus :size="20" />
                  <span>Create Auction</span>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>
