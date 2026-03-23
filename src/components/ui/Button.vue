<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="buttonClasses"
    class="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-space-dark"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger'
  color?: 'cyan' | 'purple' | 'green' | 'red' | 'orange'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  color: 'cyan',
  type: 'button',
  disabled: false
})

defineEmits<{
  click: []
}>()

const buttonClasses = computed(() => {
  const base = 'disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105'

  if (props.variant === 'primary') {
    const colors = {
      cyan: 'bg-gradient-to-r from-cyber-cyan to-cyber-purple text-space-dark shadow-lg shadow-cyber-cyan/25 hover:shadow-cyber-cyan/40 border border-cyber-cyan/30',
      purple: 'bg-gradient-to-r from-cyber-purple to-cyber-pink text-white shadow-lg shadow-cyber-purple/25 hover:shadow-cyber-purple/40 border border-cyber-purple/30',
      green: 'bg-gradient-to-r from-cyber-green to-cyber-cyan text-space-dark shadow-lg shadow-cyber-green/25 hover:shadow-cyber-green/40 border border-cyber-green/30',
      red: 'bg-gradient-to-r from-cyber-red to-cyber-orange text-white shadow-lg shadow-cyber-red/25 hover:shadow-cyber-red/40 border border-cyber-red/30',
      orange: 'bg-gradient-to-r from-cyber-orange to-cyber-red text-white shadow-lg shadow-cyber-orange/25 hover:shadow-cyber-orange/40 border border-cyber-orange/30'
    }
    return `${base} ${colors[props.color]}`
  }

  if (props.variant === 'secondary') {
    const colors = {
      cyan: 'bg-transparent border-2 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan/70',
      purple: 'bg-transparent border-2 border-cyber-purple text-cyber-purple hover:bg-cyber-purple/10 hover:border-cyber-purple/70',
      green: 'bg-transparent border-2 border-cyber-green text-cyber-green hover:bg-cyber-green/10 hover:border-cyber-green/70',
      red: 'bg-transparent border-2 border-cyber-red text-cyber-red hover:bg-cyber-red/10 hover:border-cyber-red/70',
      orange: 'bg-transparent border-2 border-cyber-orange text-cyber-orange hover:bg-cyber-orange/10 hover:border-cyber-orange/70'
    }
    return `${base} ${colors[props.color]}`
  }

  if (props.variant === 'outline') {
    return `${base} bg-transparent border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30`
  }

  if (props.variant === 'accent') {
    return `${base} bg-gradient-to-r from-cyber-green to-cyber-cyan text-space-dark font-semibold shadow-lg shadow-cyber-green/25 hover:shadow-cyber-green/40`
  }

  if (props.variant === 'danger') {
    return `${base} bg-gradient-to-r from-cyber-red to-cyber-orange text-white font-semibold shadow-lg shadow-cyber-red/25 hover:shadow-cyber-red/40`
  }

  // Ghost
  return `${base} bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30`
})
</script>
