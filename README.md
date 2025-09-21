# Nuxt ZodI18n

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

A Nuxt Module for localizing zod error messages.

Check the playground for usage doc and test will come later

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [🏀 Online playground](https://stackblitz.com/github/xibman/nuxt-zod-i18n?file=playground%2Fapp.vue)
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

<!-- Highlight some of the features your module provide here -->

- This library depends on [@nuxtjs/i18n](https://i18n.nuxtjs.org/) .
- Provide a Global error map for zod see [Zod ERROR_HANDLING](https://zod.dev/ERROR_HANDLING?id=global-error-map)
- Translation for zod errors based on [ZodIssueCode](https://zod.dev/ERROR_HANDLING?id=zodissuecode)
- A way to translate custom errors

## Quick Setup

1. Add `nuxt-zod-i18n` dependency to your project

```bash
npx nuxi@latest module add nuxt-zod-i18n
```

2. Add `nuxt-zod-i18n` to the `modules` section of `nuxt.config.ts` before the `@nuxtjs/i18n` module so the translated error map can reuse its composer instance.

```js
export default defineNuxtConfig({
  modules: ['nuxt-zod-i18n', '@nuxtjs/i18n']
})
```

That's it! You can now use Nuxt ZodI18n in your Nuxt app ✨

## Usage

Once the module is registered, it ships a Nuxt plugin and a Nitro server plugin that keep Zod's global error map in sync with the active i18n composer. You can keep using a single set of schemas on both the client and server without any manual bootstrapping.

### Client-side validation

No extra setup is needed. Any Zod errors surfaced through your forms will use the current locale automatically:

```ts
const result = registrationSchema.safeParse(formData)

if (!result.success) {
  errors.value = result.error.format()
}
```

### Server API routes

The bundled Nitro plugin attaches to every request and reapplies the error map after i18n chooses the locale, so `safeParse` and helpers such as `readValidatedBody` return translated messages out of the box.

```ts
// server/api/register.post.ts
import { createError, readValidatedBody } from 'h3'
import { useTranslation } from '#imports'
import { registrationSchema } from '~/lib/schemas'

export default defineEventHandler(async (event) => {
  const t = await useTranslation(event)

  const result = await readValidatedBody(event, (body) =>
    registrationSchema.safeParse(body),
  )

  if (!result.success) {
    throw createError({
      statusCode: 422,
      data: result.error.flatten().fieldErrors,
      statusMessage: result.error.errors[0]?.message,
    })
  }

  return {
    success: t('registrationSuccessful'),
  }
})
```

With the module installed there is no need to duplicate schemas or call any Zod-specific APIs inside your route handlers—the translated messages are available as soon as you read or parse the request body.

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-zod-i18n/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-zod-i18n

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-zod-i18n.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npm.chart.dev/nuxt-zod-i18n

[license-src]: https://img.shields.io/npm/l/nuxt-zod-i18n.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-zod-i18n

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
