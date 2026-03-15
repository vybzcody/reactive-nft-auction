<script setup lang="ts">
import { AlertCircle, CheckCircle2, TrendingUp, Clock, Crown, X, Zap } from 'lucide-vue-next'

interface Toast {
  id: number
  type: 'outbid' | 'new-bid' | 'auction-ending' | 'auction-won' | 'auction-created' | 'success' | 'error'
  title: string
  message: string
  timestamp: number
  auctionId?: number
}

interface Props {
  toasts: Toast[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  dismiss: [id: number]
  dismissAll: []
}>()

const getIcon = (type: string) => {
  const icons: Record<string, any> = {
    'outbid': AlertCircle,
    'new-bid': TrendingUp,
    'auction-ending': Clock,
    'auction-won': Crown,
    'auction-created': Zap,
    'success': CheckCircle2,
    'error': AlertCircle,
  }
  return icons[type] || AlertCircle
}

const getColorClasses = (type: string) => {
  const colors: Record<string, string> = {
    'outbid': 'border-red-500 bg-white text-gray-900',
    'new-bid': 'border-green-500 bg-white text-gray-900',
    'auction-ending': 'border-orange-500 bg-white text-gray-900',
    'auction-won': 'border-blue-500 bg-white text-gray-900',
    'auction-created': 'border-purple-500 bg-white text-gray-900',
    'success': 'border-green-500 bg-white text-gray-900',
    'error': 'border-red-500 bg-white text-gray-900',
  }
  return colors[type] || 'border-gray-200 bg-white'
}

const formatTime = (timestamp: number) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-[200] flex flex-col space-y-2 max-w-sm">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-x-full opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform translate-x-full opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="relative overflow-hidden rounded-xl border-l-4 shadow-lg bg-white p-4 cursor-pointer hover:shadow-xl transition-shadow"
        :class="getColorClasses(toast.type)"
        @click="$emit('dismiss', toast.id)"
      >
        <div class="flex items-start space-x-3">
          <component :is="getIcon(toast.type)" :size="20" class="flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <p class="text-sm font-semibold">{{ toast.title }}</p>
              <button @click.stop="$emit('dismiss', toast.id)" class="text-gray-400 hover:text-gray-600">
                <X :size="14" />
              </button>
            </div>
            <p class="text-sm text-gray-600 mt-1">{{ toast.message }}</p>
            <div class="flex items-center space-x-2 mt-2 text-xs text-gray-400">
              <span>{{ formatTime(toast.timestamp) }}</span>
              <span v-if="toast.auctionId">•</span>
              <span v-if="toast.auctionId">Auction #{{ toast.auctionId }}</span>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>

    <button
      v-if="toasts.length > 1"
      @click="$emit('dismissAll')"
      class="self-end text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg bg-white border border-gray-200 shadow-sm"
    >
      Clear all
    </button>
  </div>
</template>
