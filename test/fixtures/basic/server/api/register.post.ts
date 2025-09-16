import { getCookie, readBody } from 'h3'
import { createI18n } from 'vue-i18n'
import { registrationSchema } from '../../lib/schemas'

type ApiResponse =
  | { success: true }
  | { success: false; issues: { message: string }[] }

const messages = {
  'en-GB': {
    zodI18n: {
      errors: {
        invalid_type: 'Expected {expected}, received {received}',
      },
      types: {
        number: 'number',
        string: 'string',
      },
    },
  },
  'fr-FR': {
    zodI18n: {
      errors: {
        invalid_type:
          'Type invalide: {expected} doit être fourni(e), mais {received} a été reçu(e)',
      },
      types: {
        number: 'nombre',
        string: 'chaîne de caractères',
      },
    },
  },
} as const

export default defineEventHandler<ApiResponse>(async (event) => {
  const locale = getCookie(event, 'i18n_redirected') ?? 'en-GB'
  const i18n = createI18n({ legacy: false, locale, messages })
  event.context.i18n = i18n.global

  const body = await readBody(event)
  const result = registrationSchema.safeParse(body)

  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(issue => ({ message: issue.message })),
    }
  }

  return { success: true }
})
