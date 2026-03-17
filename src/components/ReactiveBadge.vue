<script setup lang="ts">
import { Wifi, WifiOff, Zap } from 'lucide-vue-next'
import { useReactivity } from '../composables/useReactivity'

const { connected, events } = useReactivity()
</script>

<template>
  <div class="flex items-center space-x-2">
    <!-- Connection Status -->
    <div
      class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border transition-all duration-300"
      :class="connected 
        ? 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green shadow-lg shadow-cyber-green/10' 
        : 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red shadow-lg shadow-cyber-red/10'"
    >
      <component
        :is="connected ? Wifi : WifiOff"
        :size="14"
      />
      <span>{{ connected ? 'Live' : 'Offline' }}</span>
    </div>

    <!-- Event Count -->
    <div
      v-if="events.length > 0"
      class="flex items-center justify-center min-w-6 h-6 rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white text-xs font-bold shadow-lg shadow-cyber-cyan/25 animate-pulse"
    >
      {{ events.length > 9 ? '9+' : events.length }}
    </div>
  </div>
</template>
