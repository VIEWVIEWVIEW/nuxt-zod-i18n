import type { Composer } from 'vue-i18n'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { applyErrorMap } from './error-map'

export default defineNuxtPlugin({
  name: 'zodI18n:plugin',
  // @ts-expect-error plugin from @nuxt/i18n
  dependsOn: ['i18n:plugin'],
  parallel: true,
  setup: (nuxtApp) => {
    const { dateFormat } = useRuntimeConfig().public.zodI18n
    const i18n = nuxtApp.$i18n as Composer
    applyErrorMap(i18n, dateFormat)
  },
})
