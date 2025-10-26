import { z } from 'zod'

type LocaleFactories = typeof z.locales

type LocaleFactory = LocaleFactories[keyof LocaleFactories]

type LocaleConfig = ReturnType<LocaleFactory>

const builtInLocales = z.locales as Record<string, LocaleFactory>

const LOCALE_CACHE = new Map<string, LocaleFactory>()

const FALLBACK_LOCALE = 'en'

const SPECIAL_CASES = new Map<string, string[]>([
  ['uk', ['ua']],
  ['zh-cn', ['zhCN', 'zh-CN']],
  ['zh-hans', ['zhCN', 'zh-CN']],
  ['zh-tw', ['zhTW', 'zh-TW']],
  ['zh-hant', ['zhTW', 'zh-TW']],
])

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1)

const pushUnique = (values: string[], candidate?: string) => {
  if (!candidate) {
    return
  }

  if (!values.includes(candidate)) {
    values.push(candidate)
  }
}

const buildLocaleCandidates = (localeCode?: string): string[] => {
  if (!localeCode) {
    return []
  }

  const normalized = localeCode.replace(/_/g, '-')
  const lower = normalized.toLowerCase()
  const segments = lower.split('-').filter(Boolean)

  const candidates: string[] = []

  pushUnique(candidates, localeCode)
  pushUnique(candidates, normalized)
  pushUnique(candidates, lower)

  if (segments.length > 1) {
    const upperSegments = segments.slice(1).map(segment => segment.toUpperCase())
    pushUnique(candidates, `${segments[0]}-${upperSegments.join('-')}`)
    pushUnique(candidates, `${segments[0]}${upperSegments.join('')}`)

    const capitalizedSegments = segments.slice(1).map(segment => capitalize(segment))
    pushUnique(candidates, `${segments[0]}-${capitalizedSegments.join('-')}`)
    pushUnique(candidates, `${segments[0]}${capitalizedSegments.join('')}`)
  }

  if (segments[0]) {
    pushUnique(candidates, segments[0])
  }

  const overrides = SPECIAL_CASES.get(lower)
  if (overrides) {
    for (const override of overrides) {
      pushUnique(candidates, override)
    }
  }

  return candidates
}

const resolveLocaleFactory = async (
  localeCode?: string,
): Promise<{
  factory: LocaleFactory
  appliedCode: string
}> => {
  const candidates = buildLocaleCandidates(localeCode)

  for (const candidate of candidates) {
    const builtIn = builtInLocales?.[candidate]
    if (typeof builtIn === 'function') {
      return { factory: builtIn, appliedCode: candidate }
    }

    const cached = LOCALE_CACHE.get(candidate)
    if (cached) {
      return { factory: cached, appliedCode: candidate }
    }

    try {
      const module = await import(`zod/v4/locales/${candidate}.js`)
      if (typeof module.default === 'function') {
        LOCALE_CACHE.set(candidate, module.default as LocaleFactory)
        return { factory: module.default as LocaleFactory, appliedCode: candidate }
      }
    }
    catch {
      // ignore and continue with next candidate
    }
  }

  const fallbackFactory = builtInLocales[FALLBACK_LOCALE]
  return { factory: fallbackFactory, appliedCode: FALLBACK_LOCALE }
}

export async function applyZodLocale(localeCode?: string): Promise<{
  code: string
  config: LocaleConfig
}> {
  const { factory, appliedCode } = await resolveLocaleFactory(localeCode)
  const config = factory()
  z.config(config)
  return { code: appliedCode, config }
}
