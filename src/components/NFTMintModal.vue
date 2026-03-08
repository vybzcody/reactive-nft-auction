<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Image, Bot, Palette, Smile, Grid3X3, User, Zap, Info, Upload, X } from 'lucide-vue-next'
import { useNFT } from '../composables/useNFT'
import { useCustomNFT } from '../composables/useCustomNFT'
import { DICEBEAR_STYLES } from '../config/contract'
import { publicClient } from '../config/clients'
import { NFT_CONTRACT_ADDRESS, NFT_ABI } from '../config/contract'

const emit = defineEmits<{
  minted: [tokenId: number]
  close: []
}>()

const { mint, batchMint, loading, error, getImageUrl } = useNFT()
const { uploadCustomImage, updateNFTMetadata, uploading, uploadProgress } = useCustomNFT()
const selectedStyle = ref(0)
const mintCount = ref(1)
const mintType = ref<'dicebear' | 'custom'>('dicebear')

// Custom upload state
const customFile = ref<File | null>(null)
const customPreview = ref<string>('')
const customName = ref('')
const customDescription = ref('')

const styleIcons: Record<number, any> = {
  0: User,
  1: Bot,
  2: Palette,
  3: Sparkles,
  4: Smile,
  5: Grid3X3,
}

const canMint = computed(() => {
  if (mintType.value === 'dicebear') return true
  return customFile.value !== null && customName.value.trim() !== ''
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size must be less than 10MB')
    return
  }
  
  customFile.value = file
  
  // Set default name from filename
  if (!customName.value) {
    customName.value = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
  }
  
  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    customPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeCustomFile = () => {
  customFile.value = null
  customPreview.value = ''
  customName.value = ''
  customDescription.value = ''
}

// Get the next token ID that will be minted
const getNextTokenId = async (): Promise<number> => {
  try {
    const totalSupply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: NFT_ABI,
      functionName: 'totalSupply',
    })
    return Number(totalSupply)
  } catch (error) {
    console.error('Failed to get next token ID:', error)
    return 0
  }
}

const handleMint = async () => {
  try {
    let tokenId = 0
    
    if (mintType.value === 'dicebear') {
      const result = await mint(selectedStyle.value)
      // Extract token ID from transaction receipt logs
      if (result?.receipt?.logs) {
        const mintLog = result.receipt.logs.find(log => 
          log.address.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
        )
        if (mintLog && mintLog.topics.length > 3) {
          tokenId = parseInt(mintLog.topics[3], 16)
        }
      }
    } else {
      tokenId = await mintCustom()
    }
    
    emit('minted', tokenId)
  } catch (err) {
    console.error('Minting failed:', err)
  }
}

const mintCustom = async (): Promise<number> => {
  if (!customFile.value) throw new Error('No file selected')
  if (!customName.value.trim()) throw new Error('Name is required')
  
  try {
    // Get the token ID that will be minted
    const tokenId = await getNextTokenId()
    
    // Upload custom image and metadata to IPFS
    const { imageURI } = await uploadCustomImage(
      customFile.value,
      customName.value.trim(),
      customDescription.value.trim() || `Custom NFT #${tokenId}`
    )
    
    // Mint with default style first
    const result = await mint(0)
    
    // Update the NFT with custom metadata
    await updateNFTMetadata(
      tokenId,
      imageURI,
      customName.value.trim(),
      customDescription.value.trim() || `Custom NFT #${tokenId}`
    )
    
    console.log(`Custom NFT #${tokenId} minted successfully with image:`, imageURI)
    return tokenId
    
  } catch (error) {
    console.error('Failed to mint custom NFT:', error)
    throw error
  }
}

const handleBatchMint = async () => {
  try {
    const result = await batchMint(mintCount.value)
    // Extract token IDs from batch mint result
    let firstTokenId = 0
    if (result?.receipt?.logs) {
      const mintLogs = result.receipt.logs.filter(log => 
        log.address.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
      )
      if (mintLogs.length > 0 && mintLogs[0].topics.length > 3) {
        firstTokenId = parseInt(mintLogs[0].topics[3], 16)
      }
    }
    emit('minted', firstTokenId)
  } catch (err) {
    console.error('Batch minting failed:', err)
  }
}

const previewUrl = (style: number) => {
  const randomSeed = Math.floor(Math.random() * 10000)
  return getImageUrl(randomSeed, style)
}
</script>

<template>
  <div
    class="fixed inset-0 bg-space-dark/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div class="card-gradient max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyber-cyan/20">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 pb-6 border-b border-border/50">
        <div>
          <div class="flex items-center space-x-2 mb-2">
            <Sparkles :size="20" class="text-cyber-cyan" />
            <h2 class="text-2xl font-bold gradient-text-primary">Mint NFT</h2>
          </div>
          <p class="text-sm text-muted-foreground">Choose a style and mint your unique digital collectible</p>
        </div>
        <button
          @click="$emit('close')"
          class="w-10 h-10 rounded-lg bg-space-light border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-cyber-cyan/50 transition-all"
        >
          ✕
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 p-4 bg-cyber-red/10 border border-cyber-red/30 rounded-lg backdrop-blur-sm">
        <div class="flex items-center space-x-3">
          <Info :size="20" class="text-cyber-red" />
          <span class="text-cyber-red">{{ error }}</span>
        </div>
      </div>

      <!-- Mint Type Selection -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Image :size="20" class="mr-2 text-cyber-cyan" />
          Choose Mint Type
        </h3>
        <div class="grid grid-cols-2 gap-4">
          <button
            @click="mintType = 'dicebear'"
            class="p-4 rounded-xl border-2 transition-all duration-300 text-left"
            :class="mintType === 'dicebear'
              ? 'border-cyber-cyan bg-cyber-cyan/10 shadow-lg shadow-cyber-cyan/20'
              : 'border-border/50 bg-space-light hover:border-cyber-purple/50'"
          >
            <div class="flex items-center space-x-3 mb-2">
              <Bot :size="20" :class="mintType === 'dicebear' ? 'text-cyber-cyan' : 'text-muted-foreground'" />
              <span class="font-semibold" :class="mintType === 'dicebear' ? 'text-cyber-cyan' : 'text-foreground'">DiceBear Avatar</span>
            </div>
            <p class="text-sm text-muted-foreground">Generate unique avatars using AI</p>
          </button>
          
          <button
            @click="mintType = 'custom'"
            class="p-4 rounded-xl border-2 transition-all duration-300 text-left"
            :class="mintType === 'custom'
              ? 'border-cyber-cyan bg-cyber-cyan/10 shadow-lg shadow-cyber-cyan/20'
              : 'border-border/50 bg-space-light hover:border-cyber-purple/50'"
          >
            <div class="flex items-center space-x-3 mb-2">
              <Upload :size="20" :class="mintType === 'custom' ? 'text-cyber-cyan' : 'text-muted-foreground'" />
              <span class="font-semibold" :class="mintType === 'custom' ? 'text-cyber-cyan' : 'text-foreground'">Custom Upload</span>
            </div>
            <p class="text-sm text-muted-foreground">Upload your own image to IPFS</p>
          </button>
        </div>
      </div>

      <!-- DiceBear Style Selection -->
      <div v-if="mintType === 'dicebear'" class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Palette :size="20" class="mr-2 text-cyber-purple" />
          Select Art Style
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div
            v-for="style in DICEBEAR_STYLES"
            :key="style.value"
            @click="selectedStyle = style.value"
            class="cursor-pointer group"
          >
            <div
              class="rounded-xl overflow-hidden border-2 transition-all duration-300"
              :class="selectedStyle === style.value
                ? 'border-cyber-cyan bg-cyber-cyan/10 shadow-lg shadow-cyber-cyan/20'
                : 'border-border/50 bg-space-light hover:border-cyber-purple/50 hover:shadow-lg hover:shadow-cyber-purple/10'"
            >
              <!-- Preview Image -->
              <div class="aspect-square bg-space-medium relative overflow-hidden">
                <img
                  :src="previewUrl(style.value)"
                  :alt="style.name"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              <!-- Style Info -->
              <div class="p-3 text-center">
                <div class="flex items-center justify-center space-x-1 mb-1">
                  <component
                    :is="styleIcons[style.value] || Sparkles"
                    :size="16"
                    :class="selectedStyle === style.value ? 'text-cyber-cyan' : 'text-muted-foreground'"
                  />
                  <span class="text-sm font-medium" :class="selectedStyle === style.value ? 'text-cyber-cyan' : 'text-foreground'">{{ style.name }}</span>
                </div>
                <p class="text-xs text-muted-foreground">{{ style.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Upload Section -->
      <div v-if="mintType === 'custom'" class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Upload :size="20" class="mr-2 text-cyber-green" />
          Upload Custom Image
        </h3>
        
        <div v-if="!customFile" class="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-cyber-cyan/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="hidden"
            id="file-upload"
          />
          <label for="file-upload" class="cursor-pointer">
            <Upload :size="48" class="mx-auto mb-4 text-muted-foreground" />
            <p class="text-foreground font-semibold mb-2">Click to upload image</p>
            <p class="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
          </label>
        </div>
        
        <div v-else class="space-y-4">
          <div class="flex items-start space-x-4 p-4 bg-space-light/50 rounded-xl border border-border/50">
            <div class="w-24 h-24 rounded-lg overflow-hidden bg-space-medium border border-border/50">
              <img :src="customPreview" alt="Preview" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1">
              <p class="font-semibold text-foreground">{{ customFile.name }}</p>
              <p class="text-sm text-muted-foreground">{{ (customFile.size / 1024 / 1024).toFixed(2) }} MB</p>
              <div v-if="uploading" class="mt-2">
                <div class="flex items-center space-x-2">
                  <div class="flex-1 bg-space-medium rounded-full h-2">
                    <div class="bg-cyber-cyan h-2 rounded-full transition-all duration-300" :style="{ width: uploadProgress + '%' }"></div>
                  </div>
                  <span class="text-xs text-cyber-cyan">{{ uploadProgress }}%</span>
                </div>
              </div>
            </div>
            <button
              @click="removeCustomFile"
              class="p-2 rounded-lg bg-space-medium border border-border/50 text-muted-foreground hover:text-cyber-red hover:border-cyber-red/50 transition-all"
            >
              <X :size="16" />
            </button>
          </div>
          
          <!-- Custom NFT Details -->
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">
                NFT Name <span class="text-cyber-red">*</span>
              </label>
              <input
                v-model="customName"
                type="text"
                placeholder="Enter NFT name"
                class="w-full px-4 py-3 bg-space-medium border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/20 transition-all"
                maxlength="50"
              />
              <p class="text-xs text-muted-foreground mt-1">{{ customName.length }}/50 characters</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">
                Description (Optional)
              </label>
              <textarea
                v-model="customDescription"
                placeholder="Describe your NFT..."
                rows="3"
                class="w-full px-4 py-3 bg-space-medium border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyber-cyan/50 focus:ring-1 focus:ring-cyber-cyan/20 transition-all resize-none"
                maxlength="200"
              ></textarea>
              <p class="text-xs text-muted-foreground mt-1">{{ customDescription.length }}/200 characters</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Batch Mint Option (only for DiceBear) -->
      <div v-if="mintType === 'dicebear'" class="mb-8">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Grid3X3 :size="20" class="mr-2 text-cyber-green" />
          Quantity
        </h3>
        <div class="flex items-center space-x-4 p-4 bg-space-light/50 rounded-xl border border-border/50">
          <div class="flex items-center bg-space-medium rounded-lg border border-border/50">
            <button
              @click="mintCount = Math.max(1, mintCount - 1)"
              class="px-4 py-2 text-muted-foreground hover:text-cyber-cyan transition-colors"
            >
              −
            </button>
            <input
              v-model.number="mintCount"
              type="number"
              min="1"
              max="10"
              class="w-16 bg-transparent text-center text-foreground font-semibold focus:outline-none"
            />
            <button
              @click="mintCount = Math.min(10, mintCount + 1)"
              class="px-4 py-2 text-muted-foreground hover:text-cyber-cyan transition-colors"
            >
              +
            </button>
          </div>
          <div class="flex-1">
            <p class="text-sm text-foreground font-medium">{{ mintCount }} {{ mintCount === 1 ? 'NFT' : 'NFTs' }}</p>
            <p class="text-xs text-muted-foreground">Maximum 10 per batch</p>
          </div>
          <Zap :size="20" class="text-cyber-orange" />
        </div>
      </div>

      <!-- Preview Section -->
      <div class="mb-8 p-6 bg-space-light/50 rounded-xl border border-border/50">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Image :size="20" class="mr-2 text-cyber-pink" />
          Preview
        </h3>
        <div class="flex items-center space-x-6">
          <div class="w-32 h-32 rounded-xl overflow-hidden bg-space-medium border-2 border-cyber-cyan/30 shadow-lg shadow-cyber-cyan/10">
            <img
              v-if="mintType === 'dicebear'"
              :src="getImageUrl(Date.now(), selectedStyle)"
              alt="Preview"
              class="w-full h-full object-cover"
            />
            <img
              v-else-if="customPreview"
              :src="customPreview"
              alt="Custom Preview"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-muted-foreground">
              <Upload :size="32" />
            </div>
          </div>
          <div class="flex-1">
            <p v-if="mintType === 'dicebear'" class="text-sm text-muted-foreground mb-2">
              Selected Style: <span class="text-cyber-cyan font-semibold">{{ DICEBEAR_STYLES[selectedStyle]?.name }}</span>
            </p>
            <p v-else class="text-sm text-muted-foreground mb-2">
              Upload Type: <span class="text-cyber-cyan font-semibold">Custom Image</span>
            </p>
            <p class="text-sm text-muted-foreground leading-relaxed">
              <span v-if="mintType === 'dicebear'">
                Each NFT is uniquely generated from its token ID using DiceBear API.
                Same token ID always produces the same image - truly deterministic art!
              </span>
              <span v-else>
                Your custom image will be stored on IPFS via Storacha for permanent decentralized storage.
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          @click="handleMint"
          :disabled="loading || uploading || !canMint"
          class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Sparkles :size="18" />
          <span v-if="uploading">Uploading...</span>
          <span v-else-if="loading">Minting...</span>
          <span v-else>Mint 1 NFT</span>
        </button>

        <button
          v-if="mintType === 'dicebear'"
          @click="handleBatchMint"
          :disabled="loading || mintCount === 1"
          class="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Grid3X3 :size="18" />
          <span>{{ loading ? 'Minting...' : `Mint ${mintCount} NFTs` }}</span>
        </button>
      </div>

      <!-- Info -->
      <div class="p-4 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-xl backdrop-blur-sm">
        <div class="flex items-start space-x-3">
          <Info :size="20" class="text-cyber-cyan mt-0.5 flex-shrink-0" />
          <div class="text-sm text-muted-foreground">
            <p class="font-semibold text-cyber-cyan mb-2">
              {{ mintType === 'dicebear' ? 'About DiceBear NFTs' : 'About Custom NFTs' }}
            </p>
            <ul v-if="mintType === 'dicebear'" class="space-y-1">
              <li>• Images are generated on-the-fly (no storage needed)</li>
              <li>• Deterministic: Token #5 always looks the same</li>
              <li>• 6 different art styles to choose from</li>
              <li>• High-quality SVG format</li>
            </ul>
            <ul v-else class="space-y-1">
              <li>• Images stored permanently on IPFS</li>
              <li>• Decentralized and censorship-resistant</li>
              <li>• Supports PNG, JPG, GIF formats</li>
              <li>• Maximum file size: 10MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
