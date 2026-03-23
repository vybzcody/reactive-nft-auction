<template>
  <div class="relative w-full">
    <label v-if="label" class="input-label">{{ label }}</label>
    <input
      :type="type"
      :placeholder="placeholder"
      :value="modelValue"
      :disabled="disabled"
      :readonly="readonly"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="input-field w-full"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
  type?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
