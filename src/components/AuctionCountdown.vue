<script setup lang="ts">
import { computed } from 'vue'
import { Clock, TrendingUp, DollarSign, Zap } from 'lucide-vue-next'

interface Props {
  auction?: {
    id: number
    highestBid: bigint
    endTime: bigint
  }
}

const props = defineProps<Props>()

const timeLeft = computed(() => {
  if (!props.auction) return null

  const now = Date.now()
  const endTime = Number(props.auction.endTime) * 1000
  const diff = endTime - now

  if (diff <= 0) return null

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { hours, minutes, seconds }
})

const formatTime = (time: number) => time.toString().padStart(2, '0')
const formatEther = (wei: bigint) => (Number(wei) / 1e18).toFixed(4)
</script>

<template>
  <section class="mb-12">
    <div class="card-gradient p-8 lg:p-12">
      <div class="text-center mb-12">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-cyber-cyan/10 mb-6">
          <Clock :size="32" class="text-cyber-cyan" />
        </div>

        <h2 class="text-3xl lg:text-4xl font-bold mb-4">
          <span class="gradient-text-primary">Live</span> <span class="gradient-text-secondary">Auction</span>
        </h2>

        <div v-if="!auction" class="text-muted-foreground text-lg">
          No active auctions at the moment
        </div>
        <div v-else-if="!timeLeft" class="text-muted-foreground text-lg">
          Auction has ended
        </div>
        <div v-else class="text-muted-foreground text-lg">
          Auction ending soon
        </div>
      </div>

      <div v-if="auction && timeLeft" class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <!-- Current Bid -->
        <div class="text-center lg:text-left">
          <div class="flex items-center justify-center lg:justify-start space-x-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-cyber-green/10 flex items-center justify-center">
              <TrendingUp :size="24" class="text-cyber-green" />
            </div>
            <h3 class="text-xl font-semibold text-foreground">Current Bid</h3>
          </div>

          <div class="space-y-2">
            <p class="text-4xl lg:text-5xl font-bold gradient-text-accent">
              {{ formatEther(auction.highestBid) }} STT
            </p>
          </div>
        </div>

        <!-- Countdown Timer -->
        <div class="text-center lg:text-left">
          <div class="flex items-center justify-center lg:justify-start space-x-3 mb-6">
            <div class="w-10 h-10 rounded-lg bg-cyber-red/10 flex items-center justify-center">
              <Clock :size="24" class="text-cyber-red" />
            </div>
            <h3 class="text-xl font-semibold text-foreground">Auction ending in</h3>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="bg-space-light/50 rounded-xl p-4 border border-border/50">
                <p class="text-3xl lg:text-4xl font-bold gradient-text-primary">
                  {{ formatTime(timeLeft.hours) }}
                </p>
                <p class="text-muted-foreground text-sm mt-1">hours</p>
              </div>
            </div>

            <div class="text-center">
              <div class="bg-space-light/50 rounded-xl p-4 border border-border/50">
                <p class="text-3xl lg:text-4xl font-bold gradient-text-secondary">
                  {{ formatTime(timeLeft.minutes) }}
                </p>
                <p class="text-muted-foreground text-sm mt-1">minutes</p>
              </div>
            </div>

            <div class="text-center">
              <div class="bg-space-light/50 rounded-xl p-4 border border-border/50">
                <p class="text-3xl lg:text-4xl font-bold gradient-text-accent">
                  {{ formatTime(timeLeft.seconds) }}
                </p>
                <p class="text-muted-foreground text-sm mt-1">seconds</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-8">
        <div class="text-muted-foreground mb-4">
          <div class="w-16 h-16 rounded-full bg-space-light border border-border/50 flex items-center justify-center mx-auto mb-4">
            <Clock :size="32" class="text-muted-foreground" />
          </div>
          <p class="text-lg">Create your first auction to get started</p>
        </div>
      </div>
    </div>
  </section>
</template>
