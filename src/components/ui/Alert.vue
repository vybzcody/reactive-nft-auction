<template>
  <div
    v-if="show"
    :class="alertClasses"
    class="relative w-full rounded-lg border p-4 backdrop-blur-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11"
  >
    <component :is="iconComponent" :class="iconColorClasses" class="w-5 h-5 -translate-y-0.5" />
    <h5 class="mb-1 font-medium leading-none tracking-tight">{{ title }}</h5>
    <div class="text-sm opacity-80">{{ message }}</div>
    <button v-if="dismissible" @click="$emit('dismiss')" class="absolute top-2 right-2 text-current opacity-50 hover:opacity-100 transition-opacity">
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, XCircle, CheckCircle, AlertTriangle } from 'lucide-vue-next'

interface Props {
  type?: 'info' | 'error' | 'success' | 'warning'
  title: string
  message: string
  show?: boolean
  dismissible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  show: true,
  dismissible: false
})

defineEmits<{
  dismiss: []
}>()

const alertClasses = computed(() => {
  const classes = {
    info: 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan',
    error: 'bg-cyber-red/10 border-cyber-red/30 text-cyber-red',
    success: 'bg-cyber-green/10 border-cyber-green/30 text-cyber-green',
    warning: 'bg-cyber-orange/10 border-cyber-orange/30 text-cyber-orange'
  }
  return classes[props.type]
})

const iconColorClasses = computed(() => {
  const classes = {
    info: 'text-cyber-cyan',
    error: 'text-cyber-red',
    success: 'text-cyber-green',
    warning: 'text-cyber-orange'
  }
  return classes[props.type]
})

const iconComponent = computed(() => {
  const icons = {
    info: AlertCircle,
    error: XCircle,
    success: CheckCircle,
    warning: AlertTriangle
  }
  return icons[props.type]
})
</script>
