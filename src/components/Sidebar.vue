<script setup lang="ts">
import { ref } from 'vue'
import { Star, Grid, Tag, ChevronDown } from 'lucide-vue-next'

const openSections = ref({
  status: true,
  collections: false,
  price: false,
})

const toggleSection = (section: keyof typeof openSections) => {
  openSections.value[section] = !openSections.value[section]
}
</script>

<template>
  <aside class="w-80 bg-[#FBFDFF] border-r border-gray-200 min-h-screen overflow-y-auto hidden lg:block">
    <div class="p-4 space-y-4">
      <!-- Status Filter -->
      <div class="accordion-item">
        <button
          @click="toggleSection('status')"
          class="accordion-header"
        >
          <div class="flex items-center space-x-2">
            <Star :size="18" class="text-gray-600" />
            <span>Status</span>
          </div>
          <ChevronDown
            :size="18"
            class="transition-transform duration-200"
            :class="{ 'rotate-180': openSections.status }"
          />
        </button>

        <div v-show="openSections.status" class="accordion-content">
          <div class="grid grid-cols-2 gap-2">
            <button class="filter-btn filter-btn-outline text-sm">
              Buy Now
            </button>
            <button class="filter-btn filter-btn-outline text-sm">
              On Auction
            </button>
            <button class="filter-btn filter-btn-outline text-sm">
              New
            </button>
            <button class="filter-btn filter-btn-outline text-sm">
              Has Offers
            </button>
          </div>
        </div>
      </div>

      <!-- Collections Filter -->
      <div class="accordion-item">
        <button
          @click="toggleSection('collections')"
          class="accordion-header"
        >
          <div class="flex items-center space-x-2">
            <Grid :size="18" class="text-gray-600" />
            <span>Collections</span>
          </div>
          <ChevronDown
            :size="18"
            class="transition-transform duration-200"
            :class="{ 'rotate-180': openSections.collections }"
          />
        </button>

        <div v-show="openSections.collections" class="accordion-content">
          <p class="text-sm text-gray-500 text-center py-4">No collections yet</p>
        </div>
      </div>

      <!-- Price Range Filter -->
      <div class="accordion-item">
        <button
          @click="toggleSection('price')"
          class="accordion-header"
        >
          <div class="flex items-center space-x-2">
            <Tag :size="18" class="text-gray-600" />
            <span>Price</span>
          </div>
          <ChevronDown
            :size="18"
            class="transition-transform duration-200"
            :class="{ 'rotate-180': openSections.price }"
          />
        </button>

        <div v-show="openSections.price" class="accordion-content space-y-3">
          <div class="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
            <span class="text-gray-400">-</span>
            <input
              type="number"
              placeholder="Max"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button class="w-full btn-opensea btn-primary text-sm">
            Apply
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
