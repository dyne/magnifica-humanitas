export const english: typeof import('../content/messages/en.json');
export function placeholders(value: string): string[];
export function validateMessages(messages: unknown): string[];
export function formatMessage(messages: Record<string, string>, key: string, values?: Record<string, unknown>): string;
export const dispositionKeys: Readonly<{ retain: 'disposition.retain'; adapt: 'disposition.adapt'; context: 'disposition.context'; 'omit-devotional': 'disposition.omit-devotional' }>;
export function formatDisposition(value: string, messages?: Record<string, string>): string;
export function formatSavedBlock(blockId: string, concepts: { id: string; title: string; reasoning: { id?: string }[] }[], locale?: string, messages?: Record<string, string>): string;
