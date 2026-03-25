<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Plus, Zap, Image, Clock, CheckCircle, Upload } from 'lucide-vue-next'
import { useNFT } from '../composables/useNFT'
import { useAuction } from '../composables/useAuction'
import { DICEBEAR_STYLES, NFT_CONTRACT_ADDRESS } from '../config/contract'
import NFTMintModal from './NFTMintModal.vue'

const emit = defineEmits<{
  back: []
  created: []
}>()

const props = defineProps<{
  preselectedTokenId?: number
}>()

const { userNFTs, loadUserNFTs, mint, loading: mintLoading, error: mintError, approveForAuction, isApprovedForAuction, getImageUrl } = useNFT()
const { account, isConnected, createAuction, loading: auctionLoading, error: auctionError } = useAuction()

const step = ref<'select-action' | 'mint' | 'select-nft' | 'create-auction'>('select-action')
const selectedTokenId = ref<number | null>(null)
const auctionDuration = ref('24')
const auctionReserve = ref('0')
const approving = ref(false)
const approved = ref<Record<number, boolean>>({})
const showMintModal = ref(false)

// Minting state
const uploadMode = ref<'dicebear' | 'custom'>('dicebear')
const selectedStyle = ref(0)
const mintCount = ref(1)
const selectedFile = ref<File | null>(null)
const customName = ref('')
const customDescription = ref('')
const customPreview = ref('')

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }
  
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB')
    return
  }
  
  selectedFile.value = file
  
  if (!customName.value) {
    customName.value = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    customPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeCustomFile = () => {
  selectedFile.value = null
  customPreview.value = ''
  customName.value = ''
  customDescription.value = ''
}

const loadUserNFTsData = async () => {
  if (!account.value) return
  await loadUserNFTs(account.value)
  
  // Check approval status for all NFTs
  const newApproved: Record<number, boolean> = {}
  for (const nft of userNFTs.value) {
    const tokenId = Number(nft.tokenId)
    const isApproved = await isApprovedForAuction(tokenId)
    newApproved[tokenId] = isApproved
    console.log(`[CreateAuction] NFT #${tokenId} approved:`, isApproved)
  }
  approved.value = newApproved
  console.log('[CreateAuction] Approved state:', newApproved)
}

const selectedNFT = computed(() => {
  if (selectedTokenId.value === null) return null
  return userNFTs.value.find(n => Number(n.tokenId) === selectedTokenId.value) || null
})

const handleApprove = async (tokenId: number) => {
  try {
    approving.value = true
    console.log('[CreateAuction] Approving NFT #', tokenId)
    await approveForAuction(tokenId)
    approved.value[tokenId] = true
    console.log('[CreateAuction] Approved NFT #', tokenId)
  } catch (err) {
    console.error('Approval failed:', err)
  } finally {
    approving.value = false
  }
}

const handleMint = async () => {
  try {
    await mint(selectedStyle.value)
    await loadUserNFTsData()
    emit('created')
    emit('back')
  } catch (err) {
    console.error('Mint failed:', err)
  }
}

const handleCreateAuction = async () => {
  const tokenId = selectedTokenId.value
  console.log('[CreateAuction] handleCreateAuction called, selectedTokenId:', tokenId)
  console.log('[CreateAuction] selectedNFT:', selectedNFT.value)
  console.log('[CreateAuction] isConnected:', isConnected.value)
  
  if (tokenId === null || tokenId === undefined) {
    console.error('[CreateAuction] No token ID selected')
    alert('Please select an NFT first')
    return
  }

  if (!isConnected.value) {
    console.error('[CreateAuction] Wallet not connected')
    alert('Please connect your wallet first')
    return
  }

  console.log('[CreateAuction] Creating auction:', {
    tokenId,
    duration: auctionDuration.value,
    reserve: auctionReserve.value,
  })

  try {
    await createAuction(
      tokenId,
      parseInt(auctionDuration.value) * 3600,
      BigInt(Math.floor(parseFloat(auctionReserve.value || '0') * 1e18))
    )
    emit('created')
    emit('back')
  } catch (err) {
    console.error('Create auction failed:', err)
    alert('Failed to create auction: ' + (err as Error).message)
  }
}

const handleSelectNFT = (tokenId: number) => {
  console.log('[CreateAuction] handleSelectNFT called with tokenId:', tokenId)
  selectedTokenId.value = tokenId
  step.value = 'create-auction'
  console.log('[CreateAuction] After selection - selectedTokenId:', selectedTokenId.value)
  console.log('[CreateAuction] After selection - step:', step.value)
  console.log('[CreateAuction] After selection - selectedNFT:', selectedNFT.value)
}

const handleMinted = async (tokenId: number) => {
  showMintModal.value = false
  await loadUserNFTsData()
  step.value = 'select-nft'
}

const handleDirectAuctionCreate = () => {
  // Go directly to NFT selection for auction
  if (userNFTs.value.length > 0) {
    step.value = 'select-nft'
  } else {
    // No NFTs, show message and go to mint
    alert('You need to mint an NFT first before creating an auction')
    step.value = 'mint'
  }
}

const handleMintInline = async () => {
  try {
    if (uploadMode.value === 'dicebear') {
      await mint(selectedStyle.value)
    } else {
      // Custom upload logic
      if (!selectedFile.value || !customName.value.trim()) {
        throw new Error('File and name required for custom NFT')
      }
      
      // Upload to IPFS first
      const { uploadCustomImage, updateNFTMetadata } = await import('../composables/useCustomNFT')
      const { imageURI } = await uploadCustomImage().upload(
        selectedFile.value,
        customName.value.trim(),
        customDescription.value.trim() || `Custom NFT`
      )
      
      // Mint with default style then update metadata
      const result = await mint(0)
      
      // Get token ID from result and update metadata
      if (result?.receipt?.logs) {
        const mintLog = result.receipt.logs.find(log => 
          log.address.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
        )
        if (mintLog && mintLog.topics.length > 3) {
          const tokenId = parseInt(mintLog.topics[3], 16)
          await updateNFTMetadata().updateNFTMetadata(
            tokenId,
            imageURI,
            customName.value.trim(),
            customDescription.value.trim() || `Custom NFT`
          )
        }
      }
    }
    
    await loadUserNFTsData()
    step.value = 'select-nft'
  } catch (err) {
    console.error('Mint failed:', err)
  }
}

onMounted(async () => {
  if (isConnected.value && account.value) {
    await loadUserNFTsData()
    // If preselected token ID, go directly to create-auction step
    if (props.preselectedTokenId) {
      selectedTokenId.value = props.preselectedTokenId
      step.value = 'create-auction'
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="header-main border-b border-gray-200">
      <div class="max-w-[1920px] mx-auto px-4">
        <div class="flex items-center justify-between h-20">
          <!-- Left: Back Button -->
          <button @click="$emit('back')" class="flex items-center space-x-2 text-gray-600 hover:text-blue-500">
            <ArrowLeft :size="20" />
            <span class="font-medium">Back</span>
          </button>

          <!-- Center: Title -->
          <h1 class="text-xl font-bold text-gray-900">Create</h1>

          <!-- Right: Empty for balance -->
          <div class="w-20"></div>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-12">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Create</h1>
        <p class="text-lg text-gray-600">Mint a new NFT or create an auction</p>
      </div>

      <!-- Action Selection -->
      <div v-if="step === 'select-action'" class="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        <button
          @click="step = 'mint'"
          class="p-8 rounded-2xl border-2 transition-all hover:shadow-lg"
          :class="'border-gray-200 hover:border-blue-500'"
        >
          <div class="flex flex-col items-center">
            <div class="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
              <Image :size="32" class="text-blue-500" />
            </div>
            <h3 class="text-xl font-semibold mb-2">Mint NFT</h3>
            <p class="text-sm text-gray-500 text-center">Create a new NFT with unique generative art</p>
          </div>
        </button>

        <button
          @click="handleDirectAuctionCreate"
          class="p-8 rounded-2xl border-2 transition-all hover:shadow-lg"
          :class="'border-gray-200 hover:border-blue-500'"
        >
          <div class="flex flex-col items-center">
            <div class="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mb-4">
              <Clock :size="32" class="text-cyan-500" />
            </div>
            <h3 class="text-xl font-semibold mb-2">Create Auction</h3>
            <p class="text-sm text-gray-500 text-center">List one of your NFTs for auction</p>
          </div>
        </button>
      </div>

      <!-- Mint Flow -->
      <div v-if="step === 'mint'" class="space-y-8">
        <div class="flex items-center space-x-2 mb-6">
          <button @click="step = 'select-action'" class="text-gray-600 hover:text-blue-500">
            <ArrowLeft :size="20" />
          </button>
          <h2 class="text-2xl font-bold">Mint NFT</h2>
        </div>

        <!-- Mint Type Selection -->
        <div class="mb-8">
          <h3 class="text-lg font-semibold mb-4">Choose Mint Type</h3>
          <div class="grid grid-cols-2 gap-6">
            <button
              @click="uploadMode = 'dicebear'"
              class="p-6 rounded-2xl border-4 transition-all text-left"
              :class="uploadMode === 'dicebear' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'"
            >
              <div class="flex items-center space-x-3 mb-3">
                <Image :size="24" :class="uploadMode === 'dicebear' ? 'text-blue-500' : 'text-gray-500'" />
                <span class="font-semibold text-lg" :class="uploadMode === 'dicebear' ? 'text-blue-500' : 'text-gray-900'">DiceBear Avatar</span>
              </div>
              <p class="text-sm text-gray-500">Generate unique avatars using AI</p>
            </button>
            
            <button
              @click="uploadMode = 'custom'"
              class="p-6 rounded-2xl border-4 transition-all text-left"
              :class="uploadMode === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'"
            >
              <div class="flex items-center space-x-3 mb-3">
                <Upload :size="24" :class="uploadMode === 'custom' ? 'text-blue-500' : 'text-gray-500'" />
                <span class="font-semibold text-lg" :class="uploadMode === 'custom' ? 'text-blue-500' : 'text-gray-900'">Custom Upload</span>
              </div>
              <p class="text-sm text-gray-500">Upload your own image to IPFS</p>
            </button>
          </div>
        </div>
        <!-- DiceBear Style Selection -->
        <div v-if="uploadMode === 'dicebear'" class="mb-8">
          <h3 class="text-xl font-semibold mb-6">Select Art Style</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-full overflow-hidden">
            <button
              v-for="style in DICEBEAR_STYLES"
              :key="style.value"
              @click="selectedStyle = style.value"
              class="rounded-2xl overflow-hidden border-4 transition-all hover:shadow-lg"
              :class="selectedStyle === style.value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'"
            >
              <div class="aspect-square bg-gray-100">
                <img :src="getImageUrl(Date.now(), style.value)" class="w-full h-full object-cover" />
              </div>
              <div class="p-3">
                <p class="text-sm font-medium text-center text-gray-900">{{ style.name }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Custom Upload Section -->
        <div v-if="uploadMode === 'custom'" class="mb-8">
          <h3 class="text-xl font-semibold mb-6">Upload Custom Image</h3>
          
          <div v-if="!selectedFile" class="border-4 border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <input
              type="file"
              accept="image/*"
              @change="handleFileSelect"
              class="hidden"
              id="custom-file-upload"
            />
            <label for="custom-file-upload" class="cursor-pointer">
              <Upload :size="48" class="mx-auto mb-4 text-gray-400" />
              <p class="text-lg font-semibold text-gray-700 mb-2">Click to upload image</p>
              <p class="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </label>
          </div>
          
          <div v-else class="space-y-4">
            <div class="flex items-start space-x-4 p-4 bg-gray-50 rounded-2xl">
              <div class="w-24 h-24 rounded-xl overflow-hidden">
                <img :src="customPreview" alt="Preview" class="w-full h-full object-cover" />
              </div>
              <div class="flex-1">
                <p class="font-semibold">{{ selectedFile.name }}</p>
                <p class="text-sm text-gray-500">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
              <button @click="removeCustomFile" class="text-red-500">✕</button>
            </div>
            
            <input
              v-model="customName"
              type="text"
              placeholder="NFT Name"
              class="w-full px-4 py-3 border-2 rounded-xl"
            />
          </div>
        </div>

        <!-- Mint Count -->
        <div>
          <h3 class="text-xl font-semibold mb-4">Quantity</h3>
          <div class="flex items-center space-x-4">
            <button
              @click="mintCount = Math.max(1, mintCount - 1)"
              class="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              -
            </button>
            <span class="text-2xl font-bold w-12 text-center">{{ mintCount }}</span>
            <button
              @click="mintCount = Math.min(10, mintCount + 1)"
              class="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              +
            </button>
            <span class="text-gray-500">max 10</span>
          </div>
        </div>

        <!-- Preview -->
        <div class="p-6 rounded-2xl border border-gray-200 bg-gray-50">
          <h3 class="text-xl font-semibold mb-4">Preview</h3>
          <div class="flex items-center space-x-6">
            <img :src="getImageUrl(Date.now(), selectedStyle)" class="w-32 h-32 rounded-xl object-cover" />
            <div>
              <p class="font-medium">Style: {{ DICEBEAR_STYLES[selectedStyle]?.name }}</p>
              <p class="text-sm text-gray-500 mt-1">Each NFT is uniquely generated from its token ID</p>
            </div>
          </div>
        </div>

        <!-- Mint Button -->
        <button
          @click="handleMint"
          :disabled="mintLoading"
          class="w-full btn-opensea btn-primary py-4 text-lg disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <Zap :size="20" />
          <span>{{ mintLoading ? 'Minting...' : `Mint ${mintCount} NFT${mintCount > 1 ? 's' : ''}` }}</span>
        </button>

        <p v-if="mintError" class="text-red-500 text-center">{{ mintError }}</p>
      </div>

      <!-- Select NFT for Auction -->
      <div v-if="step === 'select-nft'" class="space-y-8">
        <div class="flex items-center space-x-2 mb-6">
          <button @click="step = 'select-action'" class="text-gray-600 hover:text-blue-500">
            <ArrowLeft :size="20" />
          </button>
          <h2 class="text-2xl font-bold">Select NFT</h2>
        </div>

        <!-- No NFTs State -->
        <div v-if="userNFTs.length === 0" class="text-center py-12">
          <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image :size="48" class="text-gray-400" />
          </div>
          <h3 class="text-xl font-semibold mb-2">No NFTs Owned</h3>
          <p class="text-gray-500 mb-6">You need to mint an NFT first</p>
          <button @click="step = 'mint'" class="btn-opensea btn-primary px-6 py-3 rounded-xl">
            Mint NFT
          </button>
        </div>

        <!-- NFT Grid -->
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="nft in userNFTs"
            :key="nft.tokenId"
            @click="handleSelectNFT(Number(nft.tokenId))"
            class="card-nft cursor-pointer group"
            :class="selectedTokenId === Number(nft.tokenId) ? 'ring-4 ring-blue-500 border-blue-500' : ''"
          >
            <div class="relative aspect-square overflow-hidden bg-gray-100">
              <img :src="nft.image" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div v-if="selectedTokenId === Number(nft.tokenId)" class="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                <CheckCircle :size="16" />
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                <span class="text-white text-sm font-medium">Click to select</span>
              </div>
            </div>
            <div class="p-3">
              <h3 class="font-semibold text-sm">NFT #{{ Number(nft.tokenId) }}</h3>
              <p class="text-xs text-gray-500">{{ nft.styleName }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Auction Form -->
      <div v-if="step === 'create-auction' && selectedNFT" class="space-y-8 max-w-md mx-auto">
        <div class="flex items-center space-x-2 mb-6">
          <button @click="step = 'select-nft'" class="text-gray-600 hover:text-blue-500">
            <ArrowLeft :size="20" />
          </button>
          <h2 class="text-2xl font-bold">Create Auction</h2>
        </div>

        <!-- Selected NFT Preview -->
        <div class="p-6 rounded-2xl border border-gray-200">
          <div class="flex items-center space-x-4">
            <img :src="selectedNFT.image" class="w-20 h-20 rounded-xl object-cover" />
            <div>
              <h3 class="font-semibold">NFT #{{ Number(selectedNFT.tokenId) }}</h3>
              <p class="text-sm text-gray-500">{{ selectedNFT.styleName }}</p>
              <div v-if="approved[selectedTokenId!]" class="flex items-center space-x-1 text-green-600 text-xs mt-1">
                <CheckCircle :size="12" />
                <span>Approved</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Approval Step -->
        <div v-if="!approved[selectedTokenId!]" class="p-6 rounded-2xl border border-orange-200 bg-orange-50">
          <h3 class="font-semibold mb-3">Approve NFT Transfer</h3>
          <p class="text-sm text-gray-600 mb-4">
            You need to approve the auction contract to transfer your NFT. This is a one-time transaction.
          </p>
          <button
            @click="handleApprove(selectedTokenId!)"
            :disabled="approving"
            class="w-full btn-opensea btn-primary py-3 disabled:opacity-50"
          >
            {{ approving ? 'Approving...' : 'Approve NFT' }}
          </button>
        </div>

        <!-- Auction Settings -->
        <div v-if="approved[selectedTokenId!]" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
            <input
              v-model="auctionDuration"
              type="number"
              min="1"
              max="24"
              placeholder="24"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Reserve Price (STT)</label>
            <input
              v-model="auctionReserve"
              type="number"
              step="0.001"
              min="0"
              placeholder="0 (no reserve)"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
            <p class="text-xs text-gray-500 mt-1">Leave as 0 for no reserve price</p>
          </div>

          <button
            @click="handleCreateAuction"
            :disabled="auctionLoading"
            class="w-full btn-opensea btn-primary py-4 text-lg disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Clock :size="20" />
            <span>{{ auctionLoading ? 'Creating...' : 'Create Auction' }}</span>
          </button>

          <p v-if="auctionError" class="text-red-500 text-center">{{ auctionError }}</p>
        </div>
      </div>
    </main>

    <!-- NFT Mint Modal -->
    <NFTMintModal
      v-if="showMintModal"
      @minted="handleMinted"
      @close="showMintModal = false"
    />
  </div>
</template>
