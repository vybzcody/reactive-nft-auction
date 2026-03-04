<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Bell, Plus, User, ChevronDown, Menu, LogOut, RefreshCcw, Zap, Clock, Image } from 'lucide-vue-next'
import { useAuction } from '../composables/useAuction'

const { account, isConnected, connect, switchChain, chainId } = useAuction()

const searchQuery = ref('')
const walletDropdownOpen = ref(false)
const notificationsOpen = ref(false)
const mobileMenuOpen = ref(false)

const props = defineProps<{
  currentView?: string
}>()

const emit = defineEmits<{
  create: []
  navigate: [view: string]
  myNfts: []
}>()

const handleConnect = async () => {
  await connect()
}

const handleSwitchChain = async () => {
  await switchChain()
}

const handleDisconnect = async () => {
  window.location.reload()
}

const handleCreate = () => {
  if (!isConnected.value) {
    handleConnect()
    return
  }
  emit('create')
}

const handleMyNFTs = () => {
  if (!isConnected.value) {
    handleConnect()
    return
  }
  emit('myNfts')
}

const handleNavigate = (view: string) => {
  emit('navigate', view)
}

const isActive = computed(() => (view: string) => props.currentView === view)

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Mock notifications
const notifications = ref([
  { id: 1, type: 'bid', message: 'New bid on NFT #123', time: '2m ago', read: false },
  { id: 2, type: 'auction', message: 'Auction #456 ending soon', time: '15m ago', read: false },
])

const unreadCount = ref(2)
</script>

<template>
  <header class="header-main">
    <div class="max-w-[1920px] mx-auto px-4">
      <div class="flex items-center justify-between h-20">
        <!-- Left Section: Logo + Nav -->
        <div class="flex items-center space-x-8">
          <!-- Logo -->
          <div class="flex items-center space-x-2">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span class="text-white font-bold text-xl">R</span>
            </div>
            <span class="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent hidden lg:block">
              Reactive NFT
            </span>
          </div>

          <!-- Navigation -->
          <nav class="hidden lg:flex items-center space-x-2">
            <button
              @click="handleNavigate('dashboard')"
              class="px-4 py-2 rounded-xl font-medium transition-all"
              :class="isActive('dashboard') || isActive('marketplace')
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-blue-500 hover:bg-gray-50'"
            >
              Marketplace
            </button>
            <button
              @click="handleMyNFTs"
              class="px-4 py-2 rounded-xl font-medium transition-all"
              :class="isActive('my-nfts')
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-blue-500 hover:bg-gray-50'"
            >
              My NFTs
            </button>
          </nav>
        </div>

        <!-- Center: Search -->
        <div class="flex-1 max-w-xl mx-8 hidden md:block">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search items, collections and NFTs"
              class="search-input"
            />
          </div>
        </div>

        <!-- Right Section: Actions + Profile -->
        <div class="flex items-center space-x-4">
          <!-- Create Button -->
          <button 
            @click="handleCreate"
            class="btn-opensea btn-primary flex items-center space-x-2"
          >
            <Plus :size="18" />
            <span class="hidden sm:inline">Create</span>
          </button>

          <!-- Notifications -->
          <div class="relative">
            <button 
              @click="notificationsOpen = !notificationsOpen"
              class="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <Bell :size="20" class="text-gray-600" />
              <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <!-- Notifications Dropdown -->
            <div
              v-if="notificationsOpen"
              class="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
              @click.away="notificationsOpen = false"
            >
              <div class="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 class="font-semibold">Notifications</h3>
                <button 
                  @click="unreadCount = 0; notifications = []"
                  class="text-xs text-blue-500 hover:text-blue-600"
                >
                  Clear all
                </button>
              </div>
              
              <div class="max-h-96 overflow-y-auto">
                <div v-if="notifications.length === 0" class="p-8 text-center">
                  <Bell :size="32" class="mx-auto text-gray-300 mb-2" />
                  <p class="text-gray-500 text-sm">No notifications</p>
                </div>
                <div
                  v-for="notification in notifications"
                  :key="notification.id"
                  class="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div class="flex items-start space-x-3">
                    <div class="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" v-if="!notification.read"></div>
                    <div v-else class="w-2 h-2 flex-shrink-0"></div>
                    <div class="flex-1">
                      <p class="text-sm text-gray-900">{{ notification.message }}</p>
                      <p class="text-xs text-gray-500 mt-1">{{ notification.time }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Wallet/Profile -->
          <div v-if="!isConnected">
            <button @click="handleConnect" class="btn-opensea btn-secondary flex items-center space-x-2">
              <User :size="18" />
              <span>Connect</span>
            </button>
          </div>
          <div v-else class="relative">
            <button
              @click="walletDropdownOpen = !walletDropdownOpen"
              class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <span class="text-white text-xs font-bold">{{ account?.slice(2, 4).toUpperCase() }}</span>
              </div>
              <ChevronDown :size="16" class="text-gray-600" />
            </button>

            <!-- Wallet Dropdown -->
            <div
              v-if="walletDropdownOpen"
              class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
              @click.away="walletDropdownOpen = false"
            >
              <div class="p-3 border-b border-gray-100">
                <p class="text-xs text-gray-500 mb-1">Connected as</p>
                <p class="text-sm font-mono font-medium">{{ formatAddress(account || '') }}</p>
              </div>
              
              <button
                @click="handleSwitchChain"
                class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center space-x-3 transition-colors"
              >
                <RefreshCcw :size="16" class="text-gray-600" />
                <span>Switch Network</span>
              </button>
              
              <button
                @click="handleDisconnect"
                class="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center space-x-3 transition-colors text-red-600"
              >
                <LogOut :size="16" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
