<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, User, CreditCard, Settings, Github, HelpCircle, LogOut, Zap } from 'lucide-vue-next'

interface Props {
  address?: string
  chainId?: number
  chainName?: string
  avatar?: string
}

const props = withDefaults(defineProps<Props>(), {
  chainName: 'Unknown Chain'
})

defineEmits<{
  disconnect: []
  switchChain: []
}>()

const dropdownOpen = ref(false)

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
</script>

<template>
  <div class="relative">
    <button
      @click="dropdownOpen = true"
      class="inline-flex justify-center items-center py-2 pr-12 pl-3 h-12 text-sm font-medium rounded-lg transition-all duration-300 bg-space-light border border-border/50 hover:border-cyber-cyan/50 hover:shadow-lg hover:shadow-cyber-cyan/10 text-foreground"
    >
      <div class="w-8 h-8 rounded-full border-2 border-cyber-cyan/50 bg-gradient-to-r from-cyber-cyan to-cyber-purple flex items-center justify-center shadow-lg shadow-cyber-cyan/20">
        <span class="text-white text-xs font-bold">{{ address?.slice(2, 4).toUpperCase() }}</span>
      </div>
      <span class="flex flex-col flex-shrink-0 items-start ml-2 h-full leading-none translate-y-px">
        <span class="text-foreground font-medium">{{ formatAddress(address || '') }}</span>
        <span class="text-xs text-muted-foreground">{{ chainName }}</span>
      </span>
      <ChevronDown class="absolute right-0 mr-3 w-5 h-5 text-muted-foreground" />
    </button>

    <div
      v-show="dropdownOpen"
      @click.away="dropdownOpen = false"
      class="absolute top-0 left-1/2 z-[100] mt-12 w-64 -translate-x-1/2 transition-all duration-200"
      :class="dropdownOpen ? 'translate-y-0' : '-translate-y-2'"
    >
      <div class="p-1 mt-1 bg-space-medium/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl shadow-cyber-purple/10 text-foreground">
        <!-- Header -->
        <div class="px-3 py-2 mb-1">
          <div class="flex items-center space-x-2">
            <Zap :size="16" class="text-cyber-cyan" />
            <span class="text-sm font-bold gradient-text-primary">My Wallet</span>
          </div>
        </div>
        <div class="-mx-1 my-1 h-px bg-border/50"></div>

        <button class="relative flex w-full cursor-pointer select-none hover:bg-cyber-cyan/10 items-center rounded px-3 py-2 text-sm outline-none transition-colors group">
          <User class="mr-3 w-4 h-4 text-muted-foreground group-hover:text-cyber-cyan transition-colors" />
          <span class="text-muted-foreground group-hover:text-foreground">Profile</span>
        </button>

        <button class="relative flex w-full cursor-pointer select-none hover:bg-cyber-purple/10 items-center rounded px-3 py-2 text-sm outline-none transition-colors group">
          <CreditCard class="mr-3 w-4 h-4 text-muted-foreground group-hover:text-cyber-purple transition-colors" />
          <span class="text-muted-foreground group-hover:text-foreground">Transactions</span>
        </button>

        <button
          @click="$emit('switchChain')"
          class="relative flex w-full cursor-pointer select-none hover:bg-cyber-green/10 items-center rounded px-3 py-2 text-sm outline-none transition-colors group"
        >
          <Settings class="mr-3 w-4 h-4 text-muted-foreground group-hover:text-cyber-green transition-colors" />
          <span class="text-muted-foreground group-hover:text-foreground">Switch Network</span>
        </button>

        <div class="-mx-1 my-1 h-px bg-border/50"></div>

        <!-- Chain Info -->
        <div class="px-3 py-2">
          <div class="text-xs font-semibold text-muted-foreground mb-1">Network Info</div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Network:</span>
            <span class="text-cyber-cyan font-medium">{{ chainName }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Chain ID:</span>
            <span class="text-cyber-purple font-medium">{{ chainId }}</span>
          </div>
        </div>

        <div class="-mx-1 my-1 h-px bg-border/50"></div>

        <a
          href="https://github.com/vybzcody/reactive-nft-auction"
          target="_blank"
          rel="noopener noreferrer"
          class="relative flex w-full cursor-pointer select-none hover:bg-cyber-cyan/10 items-center rounded px-3 py-2 text-sm outline-none transition-colors group"
        >
          <Github class="mr-3 w-4 h-4 text-muted-foreground group-hover:text-cyber-cyan transition-colors" />
          <span class="text-muted-foreground group-hover:text-foreground">GitHub</span>
        </a>

        <a
          href="https://github.com/vybzcody/reactive-nft-auction/issues"
          target="_blank"
          rel="noopener noreferrer"
          class="relative flex w-full cursor-pointer select-none hover:bg-cyber-purple/10 items-center rounded px-3 py-2 text-sm outline-none transition-colors group"
        >
          <HelpCircle class="mr-3 w-4 h-4 text-muted-foreground group-hover:text-cyber-purple transition-colors" />
          <span class="text-muted-foreground group-hover:text-foreground">Support</span>
        </a>

        <div class="-mx-1 my-1 h-px bg-border/50"></div>

        <button
          @click="$emit('disconnect')"
          class="relative flex w-full cursor-pointer select-none hover:bg-cyber-red/10 items-center rounded px-3 py-2 text-sm outline-none transition-colors group"
        >
          <LogOut class="mr-3 w-4 h-4 text-cyber-red/70 group-hover:text-cyber-red transition-colors" />
          <span class="text-cyber-red/70 group-hover:text-cyber-red">Disconnect</span>
        </button>
      </div>
    </div>
  </div>
</template>
