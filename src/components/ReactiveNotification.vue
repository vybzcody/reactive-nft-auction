<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bell, X, TrendingUp, Clock, Award, Sparkles, Zap, CheckCircle2, AlertCircle, Crown, Settings } from 'lucide-vue-next'
import { useReactivity } from '../composables/useReactivity'

const { events, connected } = useReactivity()
const showPanel = ref(false)
const showSettings = ref(false)

// Debug: Watch for events
watch(events, (newVal) => {
  console.log('🔔 ReactiveNotification: events changed, count:', newVal.length)
  console.log('  Events:', newVal)
}, { deep: true })

watch(connected, (newVal) => {
  console.log('🔔 ReactiveNotification: connected =', newVal)
}, { immediate: true })

console.log('🔔 ReactiveNotification mounted, initial connected:', connected.value, 'events:', events.value.length)

// Notification settings
const toastEnabled = ref(true)
const soundEnabled = ref(false)
const outbidAlerts = ref(true)
const auctionEndingAlerts = ref(true)

const unreadCount = computed(() => {
  console.log('📢 Unread count:', events.value.length)
  return events.value.length
})
const hasNotifications = computed(() => {
  console.log('📢 Has notifications:', events.value.length > 0, 'count:', events.value.length)
  return events.value.length > 0
})

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'BidPlaced':
      return TrendingUp
    case 'AuctionExtended':
      return Clock
    case 'AuctionFinalized':
      return Award
    case 'AuctionCreated':
      return Sparkles
    case 'ReserveMet':
      return CheckCircle2
    case 'SniperDetected':
      return Zap
    case 'AuctionAutoFinalized':
      return Crown
    default:
      return Bell
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'BidPlaced':
      return 'text-cyber-green bg-cyber-green/10'
    case 'AuctionExtended':
      return 'text-cyber-purple bg-cyber-purple/10'
    case 'AuctionFinalized':
      return 'text-cyber-cyan bg-cyber-cyan/10'
    case 'AuctionCreated':
      return 'text-cyber-orange bg-cyber-orange/10'
    case 'ReserveMet':
      return 'text-cyber-green bg-cyber-green/10'
    case 'SniperDetected':
      return 'text-cyber-red bg-cyber-red/10'
    case 'AuctionAutoFinalized':
      return 'text-cyber-purple bg-cyber-purple/10'
    default:
      return 'text-muted-foreground bg-space-light'
  }
}

const getNotificationTitle = (type: string) => {
  switch (type) {
    case 'BidPlaced':
      return 'New Bid Placed'
    case 'AuctionExtended':
      return 'Auction Extended'
    case 'AuctionFinalized':
      return 'Auction Finalized'
    case 'AuctionCreated':
      return 'New Auction Created'
    case 'ReserveMet':
      return 'Reserve Price Met'
    case 'SniperDetected':
      return '🎯 Sniper Bid Detected!'
    case 'AuctionAutoFinalized':
      return 'Auction Auto-Finalized'
    default:
      return 'Notification'
  }
}

const getNotificationMessage = (event: any) => {
  const auctionId = event.auctionId || '?'
  const amount = event.amount ? (Number(event.amount) / 1e18).toFixed(4) : '?'
  const bidder = event.bidder ? `${event.bidder.slice(0, 6)}...${event.bidder.slice(-4)}` : 'Someone'
  const winner = event.winner ? `${event.winner.slice(0, 6)}...${event.winner.slice(-4)}` : 'Someone'
  const tokenId = event.tokenId || '?'

  switch (event.type) {
    case 'BidPlaced':
      return `${bidder} bid ${amount} STT on Auction #${auctionId}${event.extended ? ' • Extended!' : ''}`
    case 'AuctionExtended':
      return `Auction #${auctionId} extended by 2 minutes due to late bid`
    case 'AuctionFinalized':
      return `Auction #${auctionId} won by ${winner} for ${amount} STT`
    case 'AuctionCreated':
      return `New auction created for NFT #${tokenId} (Auction #${auctionId})`
    case 'ReserveMet':
      return `Reserve price met on Auction #${auctionId} with ${amount} STT bid`
    case 'SniperDetected':
      return `🚨 Sniper bid by ${bidder} on Auction #${auctionId}!`
    case 'AuctionAutoFinalized':
      return `Auction #${auctionId} automatically finalized on-chain`
    default:
      return `Auction #${auctionId}`
  }
}

const formatTime = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

const clearEvents = () => {
  events.value = []
}

const togglePanel = () => {
  console.log('🔔 togglePanel called, showPanel was:', showPanel.value)
  showPanel.value = !showPanel.value
  console.log('  showPanel now:', showPanel.value)
}

// Listen for global event to open panel
if (typeof window !== 'undefined') {
  window.addEventListener('open-notifications', () => {
    console.log('🔔 Received open-notifications event')
    showPanel.value = true
  })
}
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex items-center space-x-3">
    <!-- Connection Status Indicator -->
    <div
      class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border transition-all duration-300"
      :class="connected 
        ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green shadow-lg shadow-cyber-green/10' 
        : 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red shadow-lg shadow-cyber-red/10'"
      title="Reactivity Connection Status"
    >
      <div class="relative">
        <Zap :size="14" :class="connected ? 'animate-pulse' : ''" />
        <div v-if="connected" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyber-green animate-ping"></div>
      </div>
      <span>{{ connected ? 'Live' : 'Offline' }}</span>
    </div>

    <!-- Notification Bell -->
    <div class="relative">
      <button
        @click="togglePanel"
        class="relative w-11 h-11 rounded-xl bg-space-medium/80 backdrop-blur-xl border border-border/50 flex items-center justify-center hover:border-cyber-cyan/50 hover:shadow-lg hover:shadow-cyber-cyan/10 transition-all duration-300 group"
        title="Notifications"
      >
        <Bell :size="20" class="text-muted-foreground group-hover:text-cyber-cyan transition-colors" />
        
        <!-- Unread Badge -->
        <div
          v-if="unreadCount > 0"
          class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white text-xs font-bold flex items-center justify-center shadow-lg animate-pulse"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </div>
      </button>

      <!-- Notification Dropdown Panel -->
      <div
        v-if="showPanel"
        class="absolute top-14 right-0 w-80 md:w-96 bg-space-dark/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-cyber-purple/10 overflow-hidden"
        @click.away="showPanel = false"
      >
        <!-- Header -->
        <div class="p-4 border-b border-border/50 bg-space-medium/50">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <div class="relative">
                <Bell :size="20" class="text-cyber-cyan" />
                <div v-if="connected" class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyber-green animate-ping"></div>
              </div>
              <h3 class="text-lg font-bold text-foreground">Notifications</h3>
            </div>
            <div class="flex items-center space-x-2">
              <button
                v-if="hasNotifications"
                @click="clearEvents"
                class="text-xs text-muted-foreground hover:text-cyber-red transition-colors flex items-center space-x-1"
                title="Clear all"
              >
                <X :size="14" />
                <span>Clear</span>
              </button>
              <button
                @click="showPanel = false"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X :size="18" />
              </button>
            </div>
          </div>
          
          <!-- Connection Status -->
          <div class="flex items-center space-x-2 text-xs">
            <div class="flex items-center space-x-1" :class="connected ? 'text-cyber-green' : 'text-cyber-red'">
              <div class="w-1.5 h-1.5 rounded-full" :class="connected ? 'bg-cyber-green animate-pulse' : 'bg-cyber-red'"></div>
              <span>{{ connected ? 'Live updates active' : 'Reactivity offline' }}</span>
            </div>
          </div>
        </div>

        <!-- Notifications List -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="!hasNotifications" class="p-8 text-center">
            <div class="w-16 h-16 rounded-full bg-space-light border border-border/50 flex items-center justify-center mx-auto mb-4">
              <Bell :size="28" class="text-muted-foreground" />
            </div>
            <p class="text-foreground font-medium mb-1">No notifications yet</p>
            <p class="text-sm text-muted-foreground">
              Real-time auction updates will appear here
            </p>
          </div>

          <TransitionGroup
            v-else
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform -translate-x-full opacity-0"
            enter-to-class="transform translate-x-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="transform translate-x-0 opacity-100"
            leave-to-class="transform -translate-x-full opacity-0"
          >
            <div
              v-for="(event, idx) in events"
              :key="`event-${event.timestamp}-${event.auctionId || idx}`"
              class="p-4 border-b border-border/30 hover:bg-space-light/50 transition-colors cursor-pointer group"
            >
              <div class="flex items-start space-x-3">
                <!-- Icon -->
                <div :class="getNotificationColor(event.type)" class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <component :is="getNotificationIcon(event.type)" :size="18" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between">
                    <p class="text-sm font-semibold text-foreground group-hover:text-cyber-cyan transition-colors">
                      {{ getNotificationTitle(event.type) }}
                    </p>
                    <span class="text-xs text-muted-foreground whitespace-nowrap">
                      {{ formatTime(event.timestamp) }}
                    </span>
                  </div>
                  <p class="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {{ getNotificationMessage(event) }}
                  </p>
                  
                  <!-- Action Buttons -->
                  <div class="flex items-center space-x-2 mt-2">
                    <button class="text-xs text-cyber-cyan hover:text-cyber-cyan/80 font-medium transition-colors">
                      View Details
                    </button>
                    <span v-if="event.type === 'BidPlaced'" class="text-xs text-cyber-purple font-medium">
                      • Auction #{{ event.auctionId }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-border/50 bg-space-medium/50">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
              <Zap :size="12" class="text-cyber-cyan" />
              <span class="text-muted-foreground">
                {{ events.length }} {{ events.length === 1 ? 'event' : 'events' }}
              </span>
            </div>
            <button class="text-cyber-cyan hover:text-cyber-cyan/80 transition-colors flex items-center space-x-1">
              <Settings :size="12" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
