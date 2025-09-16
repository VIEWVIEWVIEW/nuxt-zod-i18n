import type { Composer } from 'vue-i18n'
import type { H3Event } from 'h3'
import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { applyErrorMap } from './error-map'

type I18nDescriptor = PropertyDescriptor & {
  get?: () => Composer | undefined
  set?: (value: Composer | undefined) => void
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event: H3Event) => {
    const { dateFormat } = useRuntimeConfig().public.zodI18n

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      event.context,
      'i18n',
    ) as I18nDescriptor | undefined

    const originalGetter = originalDescriptor?.get?.bind(event.context)
    const originalSetter = originalDescriptor?.set?.bind(event.context)

    let composer: Composer | undefined

    if (originalGetter) {
      composer = originalGetter()
    }
    else if ('value' in (originalDescriptor || {})) {
      composer = originalDescriptor?.value as Composer | undefined
    }
    else {
      composer = event.context.i18n as Composer | undefined
    }

    let assigning = false
    const assignComposer = (value: Composer | undefined) => {
      if (!assigning && originalSetter) {
        assigning = true
        try {
          originalSetter(value)
        }
        finally {
          assigning = false
        }
      }

      composer = originalGetter ? originalGetter() : value

      if (composer) {
        applyErrorMap(composer, dateFormat)
      }
    }

    Object.defineProperty(event.context, 'i18n', {
      configurable: true,
      enumerable: true,
      get() {
        return originalGetter ? originalGetter() : composer
      },
      set(value: Composer | undefined) {
        assignComposer(value)
      },
    })

    if (composer) {
      applyErrorMap(composer, dateFormat)
    }
  })
})
