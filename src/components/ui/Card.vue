<template>
  <div class="relative bg-card/80 backdrop-blur-xl rounded-xl p-6 border border-border/50 transition-all duration-300 hover:border-cyber-cyan/30 hover:shadow-lg hover:shadow-cyber-cyan/10">
    <div v-if="title" class="mb-4">
      <h3 class="text-lg font-semibold gradient-text-primary">{{ title }}</h3>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

defineProps<Props>()
</script>
