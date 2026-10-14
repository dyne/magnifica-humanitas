export interface Locale { readonly id: string; readonly autonym: string; readonly dir: string; readonly source: boolean; readonly reading: boolean; readonly messages: boolean; readonly reviewed: boolean }
export interface BrowserPreferences { languages?: readonly unknown[]; language?: unknown }
export const localeRegistry: readonly Locale[];
export const availableLocales: readonly Locale[];
export function primaryLanguage(value: unknown): string | undefined;
export function resolveBrowserLocale(preferences?: BrowserPreferences, available?: readonly Locale[]): string;
export function routeLocale(path: string): string | undefined;
export function equivalentLocaleRoute(fullPath: string, locale: string): string;
export function resolveLocaleRoute(fullPath: string, preferences?: BrowserPreferences, available?: readonly Locale[]): string;
