import { shallowRef } from 'vue'
import { number } from './locale'
import english from '../content/messages/en.json'
import { formatMessage, validateMessages, dispositionKeys } from '../scripts/messages.mjs'
export type MessageKey = keyof typeof english
export type Messages = Record<MessageKey, string>
export const messages = shallowRef<Messages>(english)
export function setMessages(value: Messages) {
  const errors = validateMessages(value)
  if (errors.length) throw new Error(errors.join('\n'))
  messages.value = value
}
export function t(key: MessageKey, values?: Record<string, unknown>) { return formatMessage(messages.value, key, values && Object.fromEntries(Object.entries(values).map(([name, value]) => [name, typeof value === 'number' ? number(value) : value]))) }

export const dispositionLabel = (value: string) => t(dispositionKeys[value as keyof typeof dispositionKeys] ?? 'disposition.unavailable')
