import { watch } from 'vue'
import type { Composer } from 'vue-i18n'
import { z } from 'zod'
import { applyZodLocale } from './locale'
import { joinValues, jsonStringifyReplacer, getKeyAndValues } from './utils'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin({
  name: 'zodI18n:plugin',
  // @ts-expect-error plugin from @nuxt/i18n
  dependsOn: ['i18n:plugin'],
  parallel: true,
  setup: async (nuxtApp) => {
    const { dateFormat } = useRuntimeConfig().public.zodI18n
    const i18n = nuxtApp.$i18n as Composer
    const { t, d, te } = i18n

    const previousConfig = { ...z.config() }
    let fallbackError = previousConfig.customError ?? previousConfig.localeError

    const currentLocale = typeof i18n.locale === 'string' ? i18n.locale : i18n.locale.value
    await applyZodLocale(currentLocale)
    fallbackError = z.config().localeError ?? fallbackError

    const normalizeTypeKey = (type: string | undefined): string | undefined => {
      if (!type) {
        return undefined
      }

      const aliases: Record<string, string> = {
        int: 'integer',
      }

      return aliases[type] ?? type
    }

    const inferTypeKey = (input: unknown): string => {
      if (input === undefined) {
        return 'undefined'
      }

      if (input === null) {
        return 'null'
      }

      if (typeof input === 'string') {
        return 'string'
      }

      if (typeof input === 'number') {
        return Number.isNaN(input) ? 'nan' : 'number'
      }

      if (typeof input === 'boolean') {
        return 'boolean'
      }

      if (typeof input === 'bigint') {
        return 'bigint'
      }

      if (typeof input === 'symbol') {
        return 'symbol'
      }

      if (typeof input === 'function') {
        return 'function'
      }

      if (input instanceof Date) {
        return 'date'
      }

      if (Array.isArray(input)) {
        return 'array'
      }

      if (input instanceof Map) {
        return 'map'
      }

      if (input instanceof Set) {
        return 'set'
      }

      if (typeof (input as Promise<unknown>)?.then === 'function') {
        return 'promise'
      }

      return 'object'
    }

    const translate = (key: string, params?: Record<string, unknown>): string | undefined => {
      return te(key) ? t(key, params) : undefined
    }

    const translateType = (type: string | undefined): string => {
      const key = normalizeTypeKey(type)
      if (!key) {
        return type ?? 'unknown'
      }

      return translate(`zodI18n.types.${key}`) ?? key
    }

    const translateValidation = (validation: string): string => {
      return translate(`zodI18n.validations.${validation}`) ?? validation
    }

    const resolveSizeKey = (origin: string): string | undefined => {
      const aliases: Record<string, string> = {
        bigint: 'number',
        int: 'number',
      }

      const key = aliases[origin] ?? origin
      return te(`zodI18n.errors.too_small.${key}.inclusive`) ? key : undefined
    }

    const formatLimit = (origin: string, value: number | bigint | Date | undefined) => {
      if (origin === 'date' && value !== undefined) {
        const dateValue = value instanceof Date ? value : new Date(Number(value))
        return Number.isFinite(dateValue.getTime()) ? d(dateValue, dateFormat) : value
      }

      if (typeof value === 'bigint') {
        return value.toString()
      }

      return value
    }

    type ZodInstance = {
      _zod?: {
        def?: {
          shape?: Record<string, unknown>
        }
      }
    }

    type LiteralDef = {
      type?: string
      values?: unknown[] | unknown
    }

    const extractDiscriminatorOptions = (issue: z.core.$ZodRawIssue) => {
      if (issue.code !== 'invalid_union' || !issue.discriminator) {
        return []
      }

      const def = issue.inst?._zod?.def
      if (!def || def.discriminator !== issue.discriminator || !Array.isArray(def.options)) {
        return []
      }

      const values = def.options.flatMap((option: ZodInstance) => {
        const shape = option?._zod?.def?.shape as Record<string, unknown> | undefined
        if (!shape || !(issue.discriminator in shape)) {
          return []
        }

        const discriminatorSchema = shape[issue.discriminator] as ZodInstance | undefined
        const literalDef = discriminatorSchema?._zod?.def as LiteralDef | undefined

        if (!literalDef || literalDef.type !== 'literal') {
          return []
        }

        const literalValues = Array.isArray(literalDef.values)
          ? literalDef.values
          : literalDef.values === undefined
            ? []
            : [literalDef.values]
        return literalValues
      })

      return values
    }

    const formatFallback = (issue: z.core.$ZodRawIssue) => {
      const fallback = fallbackError?.(issue)
      if (typeof fallback === 'string' || fallback === undefined) {
        return fallback ?? issue.message ?? 'Invalid input'
      }

      return fallback
    }

    const errorMap: z.core.$ZodErrorMap = (issue) => {
      let message: string | undefined

      switch (issue.code) {
        case 'invalid_type': {
          if (issue.input === undefined) {
            message = translate('zodI18n.errors.invalid_type_received_undefined')
              ?? translate('zodI18n.errors.required')
          }
          else {
            message = translate('zodI18n.errors.invalid_type', {
              expected: translateType(typeof issue.expected === 'string' ? issue.expected : undefined),
              received: translateType(inferTypeKey(issue.input)),
            })
          }
          break
        }
        case 'invalid_value': {
          if (issue.values.length === 1) {
            message = translate('zodI18n.errors.invalid_literal', {
              expected: JSON.stringify(issue.values[0], jsonStringifyReplacer),
            })
          }
          else if (issue.values.length > 1) {
            message = translate('zodI18n.errors.invalid_enum_value', {
              options: joinValues(issue.values),
              received: JSON.stringify(issue.input, jsonStringifyReplacer),
            })
          }
          break
        }
        case 'unrecognized_keys': {
          message = translate('zodI18n.errors.unrecognized_keys', {
            keys: joinValues(issue.keys, ', '),
          })
          break
        }
        case 'invalid_union': {
          if (issue.discriminator) {
            const options = extractDiscriminatorOptions(issue)
            if (options.length > 0) {
              message = translate('zodI18n.errors.invalid_union_discriminator', {
                options: joinValues(options),
              })
              break
            }
          }

          message = translate('zodI18n.errors.invalid_union')
          break
        }
        case 'invalid_format': {
          const format = issue.format
          if (typeof format === 'string') {
            const aliasMap: Record<string, string> = {
              starts_with: 'startsWith',
              ends_with: 'endsWith',
              uuidv4: 'uuid',
              uuidv6: 'uuid',
              uuidv7: 'uuid',
              uuidv8: 'uuid',
              cuid2: 'cuid',
            }

            const normalized = aliasMap[format] ?? format

            if (format === 'starts_with' && 'prefix' in issue) {
              message = translate('zodI18n.errors.invalid_string.startsWith', {
                startsWith: issue.prefix,
              })
            }
            else if (format === 'ends_with' && 'suffix' in issue) {
              message = translate('zodI18n.errors.invalid_string.endsWith', {
                endsWith: issue.suffix,
              })
            }
            else if (format === 'includes' && 'includes' in issue) {
              message = translate('zodI18n.errors.invalid_string.includes', {
                includes: issue.includes,
              })
            }
            else if (format === 'regex' && 'pattern' in issue) {
              message = translate('zodI18n.errors.invalid_string.regex', {
                validation: translateValidation('regex'),
              })
            }
            else {
              message = translate(`zodI18n.errors.invalid_string.${normalized}`, {
                validation: translateValidation(normalized),
              })
            }
          }
          break
        }
        case 'too_small': {
          const origin = typeof issue.origin === 'string' ? issue.origin : 'unknown'
          const sizeKey = resolveSizeKey(origin)
          if (sizeKey) {
            const limitKey = issue.exact
              ? 'exact'
              : issue.inclusive ? 'inclusive' : 'not_inclusive'

            message = translate(`zodI18n.errors.too_small.${sizeKey}.${limitKey}`, {
              minimum: formatLimit(origin, issue.minimum as number | bigint | Date | undefined),
            })
          }
          break
        }
        case 'too_big': {
          const origin = typeof issue.origin === 'string' ? issue.origin : 'unknown'
          const sizeKey = resolveSizeKey(origin)
          if (sizeKey) {
            const limitKey = issue.exact
              ? 'exact'
              : issue.inclusive ? 'inclusive' : 'not_inclusive'

            message = translate(`zodI18n.errors.too_big.${sizeKey}.${limitKey}`, {
              maximum: formatLimit(origin, issue.maximum as number | bigint | Date | undefined),
            })
          }
          break
        }
        case 'custom': {
          const { key, values } = getKeyAndValues(issue.params?.i18n, 'zodI18n.errors.custom', i18n)
          message = translate(key, values)
          break
        }
        case 'not_multiple_of': {
          message = translate('zodI18n.errors.not_multiple_of', {
            multipleOf: issue.divisor,
          })
          break
        }
        default:
          break
      }

      if (message) {
        return message
      }

      return formatFallback(issue)
    }

    z.config({ customError: errorMap })

    const localeRef = typeof i18n.locale === 'string' ? undefined : i18n.locale
    if (localeRef) {
      watch(
        localeRef,
        (newLocale) => {
          void (async () => {
            await applyZodLocale(newLocale)
            fallbackError = z.config().localeError ?? fallbackError
            z.config({ customError: errorMap })
          })()
        },
        { flush: 'post' },
      )
    }
  },
})
