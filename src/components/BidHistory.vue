<script setup lang="ts">
import { computed } from 'vue'
import { Clock, TrendingUp, User, Crown, Zap } from 'lucide-vue-next'
import { formatEther } from 'viem'
import type { BidRecord } from '../services/bidHistory'

interface Props {
  bids: BidRecord[]
  currentHighestBidder?: string
}

const props = defineProps<Props>()

const formatTime = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const isLeadingBidder = (bidder: string) => {
  if (!props.currentHighestBidder) return false
  return bidder.toLowerCase() === props.currentHighestBidder.toLowerCase()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">Bid History</h3>
      <span class="text-sm text-gray-500">{{ bids.length }} bids</span>
    </div>

    <!-- Empty State -->
    <div v-if="bids.length === 0" class="text-center py-8 bg-gray-50 rounded-xl">
      <TrendingUp :size="32" class="mx-auto text-gray-400 mb-2" />
      <p class="text-gray-500">No bids yet</p>
      <p class="text-sm text-gray-400">Be the first to bid!</p>
    </div>

    <!-- Bid Timeline -->
    <div v-else class="space-y-3">
      <div
        v-for="(bid, index) in bids.slice().reverse()"
        :key="bid.id"
        class="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-l-0"
        :class="{ 'border-blue-500': isLeadingBidder(bid.bidder) }"
      >
        <!-- Timeline Dot -->
        <div
          class="absolute -left-3 top-0 w-6 h-6 rounded-full border-2 border-white shadow flex items-center justify-center"
          :class="isLeadingBidder(bid.bidder) ? 'bg-blue-500' : 'bg-gray-300'"
        >
          <Crown v-if="isLeadingBidder(bid.bidder)" :size="12" class="text-white" />
        </div>

        <!-- Bid Card -->
        <div
          class="bg-white rounded-xl p-4 border transition-all hover:shadow-md"
          :class="isLeadingBidder(bid.bidder) ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3">
              <!-- Bidder Avatar -->
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <User :size="18" class="text-white" />
              </div>

              <!-- Bid Info -->
              <div>
                <div class="flex items-center space-x-2">
                  <p class="font-medium text-gray-900">{{ formatAddress(bid.bidder) }}</p>
                  <span
                    v-if="isLeadingBidder(bid.bidder)"
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    Leading
                  </span>
                  <span
                    v-if="bid.isProxy"
                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center space-x-1"
                  >
                    <Zap :size="10" />
                    <span>Auto</span>
                  </span>
                </div>
                <p class="text-sm text-gray-500">{{ formatTime(bid.timestamp) }}</p>
              </div>
            </div>

            <!-- Bid Amount -->
            <div class="text-right">
              <p class="text-lg font-bold text-blue-500">{{ formatEther(bid.amount) }} STT</p>
              <p v-if="index > 0" class="text-xs text-gray-400">
                +{{ formatEther(bid.amount - bids[bids.length - index - 2]?.amount || 0n) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Stats -->
    <div v-if="bids.length > 0" class="mt-6 p-4 bg-gray-50 rounded-xl">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ bids.length }}</p>
          <p class="text-xs text-gray-500">Total Bids</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ new Set(bids.map(b => b.bidder.toLowerCase())).size }}</p>
          <p class="text-xs text-gray-500">Unique Bidders</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-blue-500">{{ formatEther(bids[bids.length - 1].amount) }}</p>
          <p class="text-xs text-gray-500">Highest</p>
        </div>
      </div>
    </div>
  </div>
</template>
