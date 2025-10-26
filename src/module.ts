import { defu } from 'defu'
import {
  addPlugin,
  addImports,
  createResolver,
  defineNuxtModule,
  useLogger,
} from '@nuxt/kit'

// Module options TypeScript interface definition
export interface ModuleOptions {
  dateFormat: Intl.DateTimeFormatOptions
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    zodI18n: {
      dateFormat: Intl.DateTimeFormatOptions
    }
  }
}

export default defineNuxtModule<ModuleOptions>().with({
  meta: {
    compatibility: {
      nuxt: '>=3.0.0',
    },
    name: 'nuxt-zod-i18n',
    configKey: 'zodI18n',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    dateFormat: {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const logger = useLogger('zodI18n')

    // Check NuxtI18n module availability
    const checkI18nAvailable = !nuxt.options.modules.some((module) => {
      const i18nModuleNames = ['@nuxtjs/i18n', '@nuxtjs/i18n-edge']
      if (typeof module === 'string') {
        const isRegistered = i18nModuleNames.includes(module)
        return isRegistered
      }
      if (Array.isArray(module)) {
        const [moduleName] = module
        const isRegistered = i18nModuleNames.includes(moduleName as string)
        return isRegistered
      }

      return false
    })

    if (checkI18nAvailable) {
      logger.fatal('Nuxt I18n required')
    }

    nuxt.options.runtimeConfig.public.zodI18n = defu(
      nuxt.options.runtimeConfig.public.zodI18n,
      {
        dateFormat: options.dateFormat as Intl.DateTimeFormatOptions,
      },
    )

    addImports({ name: 'applyZodLocale', from: resolve('./runtime/locale') })

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))
  },
})
