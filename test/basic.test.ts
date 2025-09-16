import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

type ApiResponse = {
  success: boolean
  issues?: { message: string }[]
}

describe('nuxt-zod-i18n', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('translates zod errors in API routes without requiring a page request', async () => {
    const invalidPayload = { email: 123 }

    const frenchResponse = await $fetch<ApiResponse>('/api/register', {
      method: 'POST',
      body: invalidPayload,
      headers: {
        cookie: 'i18n_redirected=fr-FR',
      },
    })

    expect(frenchResponse.success).toBe(false)
    expect(frenchResponse.issues?.[0].message).toContain('Type invalide')
    expect(frenchResponse.issues?.[0].message).toContain('chaîne de caractères')
    expect(frenchResponse.issues?.[0].message).toContain('nombre')

    const englishResponse = await $fetch<ApiResponse>('/api/register', {
      method: 'POST',
      body: invalidPayload,
      headers: {
        cookie: 'i18n_redirected=en-GB',
      },
    })

    expect(englishResponse.success).toBe(false)
    expect(englishResponse.issues?.[0].message).toBe('Expected string, received number')
  })

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>basic</div>')
  })
})
